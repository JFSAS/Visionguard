from typing import List
import torch
import torch.nn as nn
import torch.nn.functional as F
from detrex.layers.box_ops import box_cxcywh_to_xyxy, box_xyxy_to_cxcywh, box_iou
from detrex.layers.position_embedding import PositionEmbeddingLearned, PositionEmbeddingSine
from detectron2.structures import Boxes, ImageList, Instances
from .transformer import DetrTransformer, DetrTransformerEncoder, DetrTransformerDecoder
from alvg.models import HEADS
from alvg.models.heads.utils import PositionEmbeddingSine1D, MLP
from .mask_head import Easy_Mask_Head


@HEADS.register_module()
class TextGuidedQuerySelectKDDETRHead(nn.Module):
    def __init__(
            self,
            num_queries=100,
            in_channels=768,
            text_max_token=20,
            embed_dim=256,
            num_classes=1,
            aux_loss=True,
            num_encoder_layers=6,
            num_decoder_layers=6,
            num_tgqg_layers=1,
            only_decoder=False,
            text_embed_aug=False,
            branch_loss_weight={},
            as_target_query_thr=0.0,
            distill_type="",  # "hard", "hard_weighted", "soft"
            decoder_freeze=False,
            prepare_target_mode="score_weighted",  # "score_weighted", "score_iou_weighted"
            share_predicthead=False,
            num_token_mlp_layers=3,
            mlp_aux_loss=False,
            tgqs_mid_dim=512,
            aux_distill_mode="klloss",  # "klloss" "smoothl1loss"
            text_guided_query_generation=False,
            score_attn_loss_weight=0.0,
            decoder_attn_loss_weight=0.0,
            img_enhance=False,
    ):
        super(TextGuidedQuerySelectKDDETRHead, self).__init__()
        self.transformer = DetrTransformer(
            encoder=None,
            decoder=None,
            embed_dim=embed_dim,
            only_decoder=only_decoder,
            img_enhance=img_enhance,
            num_decoder_layers=num_decoder_layers,
        )
        assert prepare_target_mode in ["score_weighted", "score_iou_weighted"]
        self.input_proj = nn.Conv2d(in_channels, embed_dim, kernel_size=1)
        self.input_text_proj = nn.Linear(in_channels, embed_dim)
        self.num_queries = num_queries
        self.text_embed_aug = text_embed_aug
        self.as_target_query_thr = as_target_query_thr
        self.prepare_target_mode = prepare_target_mode
        self.mlp_aux_loss = mlp_aux_loss
        self.text_guided_query_generation = text_guided_query_generation
        self.branch_loss_weight = branch_loss_weight
        # self.query_embed = nn.Embedding(num_queries, embed_dim)
        self.num_classes = num_classes
        self.aux_loss = aux_loss
        self.position_embedding = PositionEmbeddingSine(
            num_pos_feats=embed_dim // 2,
            temperature=10000,
            normalize=True,
        )
        self.position_embedding_1d = PositionEmbeddingSine1D(
            num_pos_feats=embed_dim // 2,
            temperature=10000,
            normalize=True,
        )
        self.query_embed = nn.Embedding(num_queries, embed_dim)

        # define classification head and box head
        if share_predicthead:
            self.class_embed_decoder = nn.Linear(embed_dim, num_classes + 1)
            self.bbox_embed_decoder = MLP(input_dim=embed_dim, hidden_dim=embed_dim, output_dim=4, num_layers=3)
            self.class_embed_token = self.class_embed_decoder
            self.bbox_embed_token = self.bbox_embed_decoder
        else:
            self.class_embed_decoder = nn.Linear(embed_dim, num_classes + 1)
            self.bbox_embed_decoder = MLP(input_dim=embed_dim, hidden_dim=embed_dim, output_dim=4, num_layers=3)
            self.class_embed_token = nn.Linear(embed_dim, num_classes + 1)
            self.bbox_embed_token = MLP(input_dim=embed_dim, hidden_dim=embed_dim, output_dim=4, num_layers=3)

        if text_guided_query_generation:
            self.text_guided_query_generation_transformer = DetrTransformerDecoder(
                embed_dim=embed_dim,
                num_heads=8,
                attn_dropout=0.1,
                feedforward_dim=tgqs_mid_dim,
                ffn_dropout=0.1,
                num_layers=num_tgqg_layers,
                return_intermediate=False,
                post_norm=True,
            )
        self.mask_head = Easy_Mask_Head(embed_dim)

    def x_mask_pos_enc(self, x, img_metas):
        batch_size = x.size(0)
        try:
            input_img_h, input_img_w = img_metas[0]["batch_input_shape"]
        except:
            input_img_h, input_img_w, _ = img_metas[0]["img_shape"]
        x_mask = x.new_ones((batch_size, input_img_h, input_img_w))
        # CAUTION: do not support random flipping
        for img_id in range(batch_size):
            img_h, img_w, _ = img_metas[img_id]["img_shape"]
            x_mask[img_id, :img_h, :img_w] = 0

        x_mask = F.interpolate(x_mask.unsqueeze(1), size=x.size()[-2:]).to(torch.bool).squeeze(1)

        x_pos_embeds = self.position_embedding(x_mask)

        return x_mask, x_pos_embeds

    def forward_general(self, x_mm, img_metas, cls_feat=None, text_feat=None, text_mask=None):
        # feature proj to embed channels
        x_mm = self.input_proj(x_mm)
        text_feat = self.input_text_proj(text_feat)
        img_masks, pos_embed = self.x_mask_pos_enc(x_mm, img_metas)  # TODO: fix the img mask

        text_pos_embed = (self.position_embedding_1d(text_feat).unsqueeze(0).
                          repeat(text_feat.shape[0], 1, 1).permute(1, 0, 2).cuda())
        # text guided query generation
        if self.text_guided_query_generation:
            text_feat_filter = torch.cat(list(
                map(lambda feat, mask: torch.max(feat[mask, :], dim=0, keepdim=True)[0], text_feat,
                    ~text_mask))).unsqueeze(1).repeat(1, self.num_queries, 1)
            query_embed_input = self.query_embed.weight.unsqueeze(0).repeat(x_mm.shape[0], 1, 1).transpose(0, 1)
            target = torch.zeros_like(query_embed_input)
            text_feat_input = text_feat.transpose(0, 1)
            query_embed = self.text_guided_query_generation_transformer(
                query=target,
                key=text_feat_input,
                value=text_feat_input,
                key_pos=text_pos_embed,
                query_pos=query_embed_input,
                key_padding_mask=text_mask.bool())
            query_embed = query_embed[0].transpose(0, 1) + text_feat_filter + query_embed_input.transpose(0, 1)
        else:
            query_embed = self.query_embed.weight.unsqueeze(0).repeat(x_mm.shape[0], 1, 1)

        hidden_states, memory, score, attn_map = self.transformer(x_mm, img_masks, query_embed, pos_embed,
                                                                  text_feat_filter[:, :1, :], text_feat_input, text_mask.bool(), text_pos_embed)

        outputs_class_decoder_branch = self.class_embed_decoder(hidden_states)
        outputs_coord_decoder_branch = self.bbox_embed_decoder(hidden_states).sigmoid()
        pred_masks = None

        # pred_masks = self.mask_head(hidden_states[-1], pos_embed, memory)

        decoder_branch_output = {
            "pred_logits": outputs_class_decoder_branch[-1],
            "pred_boxes": outputs_coord_decoder_branch[-1],
            "pred_masks": pred_masks,
        }

        output = {
            "pred_masks": pred_masks,
            "decoder_branch_output": decoder_branch_output,
            "outputs_class_decoder_branch": outputs_class_decoder_branch,
            "outputs_coord_decoder_branch": outputs_coord_decoder_branch,
            "decoder_features": hidden_states,
            "x_mm": x_mm,
            "img_masks": img_masks,
            "score": score,
            "attn_map": attn_map,
        }

        return output
    def forward_test(self, x_mm, img_metas, text_feat=None, cls_feat=None, with_bbox=False, with_mask=False,
                     text_mask=None):
        return self.forward_general(x_mm, img_metas, text_feat=text_feat, cls_feat=cls_feat, text_mask=text_mask)

    def inference(self, box_cls, box_pred, image_sizes):
        """Inference function for DETR

        Args:
            box_cls (torch.Tensor): tensor of shape ``(batch_size, num_queries, K)``.
                The tensor predicts the classification probability for each query.
            box_pred (torch.Tensor): tensors of shape ``(batch_size, num_queries, 4)``.
                The tensor predicts 4-vector ``(x, y, w, h)`` box
                regression values for every queryx
            image_sizes (List[torch.Size]): the input image sizes

        Returns:
            results (List[Instances]): a list of #images elements.
        """
        assert len(box_cls) == len(image_sizes)
        results = []
        # For each box we assign the best class or the second best if the best on is `no_object`.
        scores, labels = F.softmax(box_cls, dim=-1)[:, :, :-1].max(-1)

        for i, (scores_per_image, labels_per_image, box_pred_per_image, image_size) in enumerate(
                zip(scores, labels, box_pred, image_sizes)):
            result = Instances(image_size)
            result.pred_boxes = Boxes(box_cxcywh_to_xyxy(box_pred_per_image))
            result.pred_boxes.scale(scale_x=image_size[1], scale_y=image_size[0])
            result.scores = scores_per_image
            result.pred_classes = labels_per_image
            results.append(result)
        return results

