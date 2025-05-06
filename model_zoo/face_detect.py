from typing import Any, List
import numpy as np


# Model's weights paths
PATH = "model_zoo/weights/yolov8n-face.pt"

# Google Drive URL from repo (https://github.com/derronqi/yolov8-face) ~6MB
WEIGHT_URL = "https://drive.google.com/uc?id=1qcr9DbgsX3ryrz2uU8w4Xm3cOrRywXqb"


class YoloClient:
    def __init__(self, device='cuda'):
        self.model = self.build_model().to(device)

    def build_model(self) -> Any:
        """
        Build a yolo detector model
        Returns:
            model (Any)
        """

        # Import the Ultralytics YOLO model
        try:
            from ultralytics import YOLO
        except ModuleNotFoundError as e:
            raise ImportError(
                "Yolo is an optional detector, ensure the library is installed. "
                "Please install using 'pip install ultralytics'"
            ) from e

        weight_path = PATH

        # Return face_detector
        return YOLO(weight_path)

    def detect_faces(self, img: np.ndarray, conf=0.25):
        """
        Detect and align face with yolo

        Args:
            img (np.ndarray): pre-loaded image as numpy array

        Returns:
            results (List[FacialAreaRegion]): A list of FacialAreaRegion objects
        """
        resp = []

        # Detect faces
        self.model.eval()
        results = self.model.predict(img, verbose=False, show=False, conf=conf)

        # For each face, extract the bounding box, the landmarks and confidence
        for result in results:

            xyxy = result.boxes.xyxy.cpu().numpy()
            confidence = result.boxes.conf.cpu().numpy()

            resp.append((xyxy, confidence))

        return resp
