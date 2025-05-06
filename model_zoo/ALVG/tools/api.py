from transformers import XLMRobertaTokenizer
import cv2
import torch
import numpy as np
import sys
sys.path.append(r"/root/autodl-tmp/model_zoo/ALVG")
from alvg.models import build_model, ExponentialMovingAverage
from alvg.utils import (get_root_logger, load_checkpoint, init_dist,
                         is_main, load_pretrained_checkpoint)
import pycocotools.mask as maskUtils

from mmcv.utils import Config, DictAction
import os
try:
    import apex
except:
    pass


device = torch.device("cuda" if torch.cuda.is_available() else "")


def normalize_image(image_tensor):
    mean = torch.tensor([123.675, 116.28, 103.53]) / 255.0
    std = torch.tensor([58.395, 57.12, 57.375]) / 255.0
    mean_tensor = mean.view(1, 3, 1, 1).to(device)
    std_tensor = std.view(1, 3, 1, 1).to(device)
    return (image_tensor - mean_tensor) / std_tensor


class ALVG:
    def __init__(self):
        cfg = Config.fromfile("/root/autodl-tmp/model_zoo/ALVG/configs/single/ViT-base/grefcoco/grefcoco.py")
        cfg.model['head']['img_enhance'] = True
        self.model = build_model(cfg.model).to(device)
        self.tokenizer = XLMRobertaTokenizer("/root/autodl-tmp/model_zoo/ALVG/weights/beit3.spm")
        load_checkpoint(self.model, None, load_from="/root/autodl-tmp/model_zoo/ALVG/weights/det_best2.pth")
        self.model.eval()

    def process(self, img_list, expression):
        if expression is None:
            return None, None
        tokens = self.tokenizer.tokenize(expression)
        tokens = self.tokenizer.convert_tokens_to_ids(tokens)
        tokens = [self.tokenizer.bos_token_id] + tokens[:] + [self.tokenizer.eos_token_id]
        num_tokens = len(tokens)
        padding_mask = [0] * num_tokens + [1] * (20 - num_tokens)
        ref_expr_inds = tokens + [self.tokenizer.pad_token_id] * (20 - num_tokens)
        ref_expr_inds = np.array(ref_expr_inds, dtype=int)
        ref_expr_inds = torch.tensor(ref_expr_inds, dtype=torch.int64).unsqueeze(0).repeat(len(img_list), 1)
        text_attention_mask = torch.tensor(padding_mask, dtype=torch.int64).unsqueeze(0).repeat(len(img_list), 1)

        image_tensor = []
        img_metas = []
        original_image_shape = []
        for img in img_list:
            original_image_shape.append(img.shape[:2])
            img = torch.from_numpy(cv2.resize(img, (640, 640), interpolation=cv2.INTER_AREA).astype(np.float32)) / 255.0
            img = img.permute(2, 0, 1)

            image_tensor.append(img)
            img_metas.append({"batch_input_shape": (640, 640), "img_shape": (640, 640, 3), "target": 1})

        image_tensor = torch.stack(image_tensor).to(device)
        image_tensor = normalize_image(image_tensor)
        ref_expr_inds = ref_expr_inds.to(device)
        text_attention_mask = text_attention_mask.to(device)

        res, attn_map, score = self.model.forward_test(image_tensor, ref_expr_inds, img_metas, text_attention_mask)
        res = res[0]

        list_xyxy = []
        list_conf = []
        for result, hw in zip(res['pred_bboxes'], original_image_shape):
            xyxy = []
            h_scale, w_scale = 640 / hw[0], 640 / hw[1]
            scores = result['scores'].cpu().numpy()
            boxes = result['boxes'].cpu().numpy()
            high_confidence_scores_idx = np.where(scores > 0.95)[0]
            high_confidence_boxes = boxes[high_confidence_scores_idx]

            list_conf.append(scores[high_confidence_scores_idx])

            for box in high_confidence_boxes:
                x1, y1, x2, y2 = box.astype(int)
                x1, x2 = x1 / w_scale, x2 / w_scale
                y1, y2 = y1 / h_scale, y2 / h_scale
                x1, x2, y1, y2 = int(x1), int(x2), int(y1), int(y2)

                xyxy.append([x1, y1, x2, y2])
            list_xyxy.append(xyxy)

        return list_xyxy, list_conf
