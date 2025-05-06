from prettytable import PrettyTable
import os
# os.environ['CUDA_VISIBLE_DEVICES'] = '3'
import torch
import numpy as np
from PIL import Image
import os.path as op
from datasets.bases import tokenize
from datasets import build_dataloader
from processor.processor import do_inference
from utils.checkpoint import Checkpointer
from utils.logger import setup_logger
from model import build_model
from utils.metrics import Evaluator
import argparse
from utils.iotools import load_train_configs

def cosine_similarity_matrix(target, x):
    target_normalized = target / torch.norm(target, p=2, dim=1, keepdim=True)
    x_normalized = x / torch.norm(x, p=2, dim=1, keepdim=True)
    cosine_sim = torch.mm(target_normalized, x_normalized.t())
    return cosine_sim.cpu().numpy()


if __name__ == '__main__':

    parser = argparse.ArgumentParser(description="IRRA Test")
    parser.add_argument("--config_file", default='logs/RSTPReid/20250316_225158_iira/configs.yaml')
    # parser.add_argument("--config_file", default='logs/RSTPReid/irra/configs.yaml')
    args = parser.parse_args()
    args = load_train_configs(args.config_file)

    args.training = False
    logger = setup_logger('IRRA', save_dir=args.output_dir, if_train=args.training)
    logger.info(args)
    device = "cuda"

    test_img_loader, test_txt_loader, num_classes = build_dataloader(args)
    model = build_model(args, num_classes=num_classes)
    checkpointer = Checkpointer(model)
    checkpointer.load(f=op.join(args.output_dir, 'best.pth'))
    model.to(device)
    img = Image.open('0039_c14_0024.jpg')
    img = test_img_loader.dataset.transform(img).unsqueeze(0).to(device)
    texts = [
        'The woman has brown-long hair.She wears a black tight jacket and a pair of navy-blue jeans.Her shoes are white.She has a black shoulder bag.',
        'The woman has long black hair and is wearing a yellow turtleneck sweater with a black coat over it.',
        'The woman has short black hair and is wearing a red turtleneck sweater with a black coat over it.',
        'The woman has short black hair and is wearing a yellow turtleneck sweater with a black coat over it.',
        'The woman has long black hair.She wears a yellow turtleneck sweater with a black coat over it.Her shoes are white.She has a black shoulder bag.',
            ]
    cap = []
    for text in texts:
        cap.append(tokenize(text, tokenizer=test_txt_loader.dataset.tokenizer, text_length=77, truncate=True))
    cap = torch.stack(cap).to(device)
    model.eval()
    with torch.no_grad():
        text_embed = model.encode_text(cap).cpu()
        img_embed = model.encode_image(img).cpu()
        csm = cosine_similarity_matrix(text_embed, img_embed)
        print(csm)



