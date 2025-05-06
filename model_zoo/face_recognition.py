import cv2
import torch
import numpy as np

from model_zoo.arcface_torch.backbones import get_model


class FaceRecognition:
    def __init__(self, weights_path=r'/root/autodl-tmp/model_zoo/weights/ms1mv3_arcface_r50_fp16/backbone.pth', device='cuda'):
        self.model = get_model('r50', fp16=False)
        self.model.load_state_dict(torch.load(weights_path), strict=True)
        self.model = self.model.eval().to(device)
        self.device = device

    def represent(self, imgs, max_batch_size=128):
        imgs_list = []
        for img in imgs:
            img = cv2.resize(img, (112, 112))
            img = np.transpose(img, (2, 0, 1))
            imgs_list.append(torch.from_numpy(img).float())

        imgs_torch = torch.stack(imgs_list)
        imgs_torch.div_(255).sub_(0.5).div_(0.5)
        imgs_torch = imgs_torch.to(self.device)
        self.model.eval()
        with torch.no_grad():
            feat = self.model(imgs_torch)
        return feat

