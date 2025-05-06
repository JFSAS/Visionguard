import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config import cfg
from model import make_model
from utils.logger import setup_logger
import torch
from PIL import Image
import torchvision.transforms as T



class Args:
    def __init__(self):
        self.config_file = None
        self.opts = []

    def __repr__(self):
        return f"Args(config_file={self.config_file}, opts={self.opts})"

# 创建 Args 实例
args = Args()

# 设置参数值
args.config_file = "/root/autodl-tmp/model_zoo/Pose2ID/demo/TransReID/configs/Market/vit_transreid_stride.yml"
args.opts = [
    "TEST.WEIGHT", "/root/autodl-tmp/model_zoo/weights/transformer_20.pth",
    "MODEL.DEVICE_ID", "('0')"
]



if args.config_file != "":
    cfg.merge_from_file(args.config_file)
cfg.merge_from_list(args.opts)
cfg.freeze()

output_dir = cfg.OUTPUT_DIR
if output_dir and not os.path.exists(output_dir):
    os.makedirs(output_dir)

logger = setup_logger("transreid", output_dir, if_train=False)
logger.info(args)

if args.config_file != "":
    logger.info("Loaded configuration file {}".format(args.config_file))
    with open(args.config_file, 'r') as cf:
        config_str = "\n" + cf.read()
        logger.info(config_str)
logger.info("Running with config:\n{}".format(cfg))

os.environ['CUDA_VISIBLE_DEVICES'] = cfg.MODEL.DEVICE_ID

# train_loader, train_loader_normal, val_loader, num_query, num_classes, camera_num, view_num = make_dataloader(cfg)
val_transforms = T.Compose([
        T.Resize(cfg.INPUT.SIZE_TEST),
        T.ToTensor(),
        T.Normalize(mean=cfg.INPUT.PIXEL_MEAN, std=cfg.INPUT.PIXEL_STD)
    ])
model = make_model(cfg, num_class=751, camera_num=0, view_num = 0)
if cfg.TEST.WEIGHT != '':
    model.load_param(cfg.TEST.WEIGHT)
    model.to('cuda').eval()

def solider(img_list):
    img_tensor = []
    for img in img_list:
        pil_image = Image.fromarray(img)
        img_tensor.append(val_transforms(pil_image))
    img_tensor = torch.stack(img_tensor).to('cuda').float()
    # img_tensor = normalize_image(img_tensor)
    with torch.no_grad():
        res = model(img_tensor)
        return res


