import torch
import numpy as np
from PIL import Image
import os.path as op
from .datasets.bases import tokenize
from .datasets.build import build_transforms
from .utils.checkpoint import Checkpointer
from .utils.logger import setup_logger
from .model import build_model
from argparse import Namespace
from .utils.iotools import load_train_configs
from .utils.simple_tokenizer import SimpleTokenizer

def tokenize_text(text):
    return tokenize(text, tokenizer=SimpleTokenizer(), text_length=77, truncate=True)

args = Namespace(
    config_file='model_zoo/VFE_TPS/logs/RSTPReid/20250316_225158_iira/configs.yaml'
)
args = load_train_configs(args.config_file)
args.training = False
device = "cuda"


class VFE_TPS:
    def __init__(self):
        self.model = build_model(args, num_classes=3701)
        checkpointer = Checkpointer(self.model)
        checkpointer.load(f=op.join('model_zoo/VFE_TPS/logs/RSTPReid/20250316_225158_iira', 'best.pth'))
        self.model.to(device)
        self.transform = build_transforms(is_train=False)