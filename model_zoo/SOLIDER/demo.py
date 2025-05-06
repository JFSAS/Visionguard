from swin_transformer import swin_tiny_patch4_window7_224,swin_small_patch4_window7_224,swin_base_patch4_window7_224
import torch
model_path = '/root/autodl-tmp/model_zoo/SOLIDER/swin_base.pth'
semantic_weight = 1.0

swin = swin_base_patch4_window7_224(convert_weights=False, semantic_weight=semantic_weight)
swin.init_weights(model_path)
feat_dim = swin.num_features[-1]
print(feat_dim)
