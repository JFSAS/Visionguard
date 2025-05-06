import torch

obj = torch.load('/root/autodl-tmp/model_zoo/weights/swin_small.pth', map_location="cpu")
print(obj)