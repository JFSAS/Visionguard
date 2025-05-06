from ultralytics import YOLO


class YOLO11:
    def __init__(self, model_path, device='cuda'):
        self.model = YOLO(model_path).to(device)
        self.model.eval()

    def process_images(self, image_list, conf=0.6):

        results = self.model(image_list, conf=conf)
        xyxy = []
        cls = []
        conf = []

        for result in results:
            xyxy.append(result.boxes.xyxy.cpu().numpy())
            cls.append(result.boxes.cls.cpu().numpy())
            conf.append(result.boxes.conf.cpu().numpy())

        return xyxy, cls, conf

    def get_cls(self):
        return self.model.names
