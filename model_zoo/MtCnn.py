import numpy as np
from mtcnn import MTCNN


class MtCnn:
    def __init__(self):
        self.model = MTCNN()

    def detect_faces(self, imgs: np.ndarray):
        """
        Detect and align face with mtcnn

        Args:
            imgs (np.ndarray): pre-loaded image as numpy array

        Returns:
            results: A list of FacialAreaRegion objects
        """

        # mtcnn expects RGB but OpenCV read BGR
        # img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        result = []
        img_rgb = [img[:, :, ::-1] for img in imgs]
        detections = self.model.detect_faces(img_rgb)

        if detections is not None and len(detections) > 0:

            for current_detection in detections:
                if current_detection == []:
                    result.append([])
                    continue
                current_detection = current_detection[0]
                x, y, w, h = current_detection["box"]
                confidence = current_detection["confidence"]
                # mtcnn detector assigns left eye with respect to the observer
                # but we are setting it with respect to the person itself
                left_eye = current_detection["keypoints"]["right_eye"]
                right_eye = current_detection["keypoints"]["left_eye"]

                result.append([x, y, w, h, left_eye, right_eye, confidence])

        return result
