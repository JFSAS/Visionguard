from model_zoo.face_recognition import FaceRecognition
from model_zoo.reid import REID
from model_zoo.body_detect import YOLO11
from tools import *
from model_zoo.face_detect import YoloClient
from db import VectorDatabase
from model_zoo.VFE_TPS.api import VFE_TPS, tokenize_text
from model_zoo.ALVG.tools.api import ALVG
import numpy as np
import torch
import cv2
import time
from model_zoo.Pose2ID.demo.TransReID.test import solider


body_db = VectorDatabase(1024)
face_db = VectorDatabase(512)
caption_db = VectorDatabase(512)


def save_db():
    body_db.save_index('body.db')
    face_db.save_index('face.db')
    caption_db.save_index('caption.db')


def load_db():
    body_db.load_index('body.db')
    face_db.load_index('face.db')
    caption_db.load_index('caption.db')


class Model:
    def __init__(self, models_to_load=None):
        reid_path = 'model_zoo/weights/osnet_x1_0_market_256x128_amsgrad_ep150_stp60_lr0.0015_b64_fb10_softmax_labelsmooth_flip.pth'
        yolo11_path = 'model_zoo/weights/yolo11m.pt'
        if models_to_load is None:
            models_to_load = ['reid', 'face_recognition', 'body_detect', 'face_detect', 'caption_reid', 'ALVG']
        self.reid = REID(reid_path) if 'reid' in models_to_load else None
        self.face_recognition = FaceRecognition() if 'face_recognition' in models_to_load else None
        self.body_detect = YOLO11(yolo11_path) if 'body_detect' in models_to_load else None
        self.face_detect = YoloClient() if 'face_detect' in models_to_load else None
        self.caption_reid = VFE_TPS() if 'caption_reid' in models_to_load else None
        self.ALVG = ALVG() if 'ALVG' in models_to_load else None
        self.expression = None
        if self.body_detect is not None:
            self.cls = self.body_detect.get_cls()

    def embed_body(self, img_list):
        if len(img_list) == 0:
            return []
        return solider(img_list)

    def embed_face(self, img_list):
        if len(img_list) == 0:
            return []
        return self.face_recognition.represent(img_list)

    def search_body(self, img_list):
        # TODO
        return

    def search_face(self, img_list):
        # TODO
        return

    def v_embed_and_get_ids(self, img_list, ids):
        img_list = [self.caption_reid.transform(img) for img in img_list]
        img_list = torch.stack(img_list).to('cuda')
        with torch.no_grad():
            embeddings = self.caption_reid.model.encode_image(img_list)
        embeddings = embeddings.cpu().numpy()
        ids = caption_db.add_vectors(embeddings, ids, threshold=0.95)
        return ids

    def embed_and_get_ids(self, img_list, task='face'):
        assert task in ['face', 'body']
        assert len(img_list) > 0
        embed_map = {
            'face': self.embed_face,
            'body': self.embed_body
        }
        db_map = {
            'face': face_db,
            'body': body_db
        }
        embedding = embed_map[task](img_list)
        ids = db_map[task].add_vectors(embedding.cpu().numpy())
        return ids

    def search_by_caption(self, caption, top_k=1):
        caption = tokenize_text(caption).unsqueeze(0).to('cuda')
        with torch.no_grad():
            embedding = self.caption_reid.model.encode_text(caption)
        embedding = embedding.cpu().numpy()
        search_results = caption_db.search_vectors(embedding, top_k)[0]
        return search_results

    def process(self,
                frames,
                body_threshold=0.6,
                face_threshold=0.25):
        """

        Args:
            frames: [img1, img2, img3, img4, ...]
            real_time_body: [feature1, feature2, feature3, feature4, ...]
            real_time_face: [feature1, feature2, feature3, feature4, ...]

        Returns:

        """

        list_body_xyxy = []
        list_face_xyxy = []
        list_body_img = []
        list_face_img = []
        list_body_conf = []
        list_face_conf = []

        list_body_id = []
        list_face_id = []

        xyxy, cls, conf = self.body_detect.process_images(frames, conf=body_threshold)
        face_results = self.face_detect.detect_faces(frames, conf=face_threshold)

        num_face = []
        num_body = []
        frames_cnt = len(frames)
        for frame, xyxy_, cls_, conf_, face_result in zip(frames, xyxy, cls, conf, face_results):

            body_conf = conf_[cls_ == 0]
            body_xyxy = xyxy_[cls_ == 0]

            if len(body_xyxy) == 0:
                body_xyxy = []
                body_conf = []

            faces_xyxy, faces_conf = face_result

            if len(faces_xyxy) == 0:
                faces_xyxy = []
                faces_conf = []

            list_body_xyxy.append(body_xyxy)
            list_face_xyxy.append(faces_xyxy)
            list_body_conf.append(body_conf)
            list_face_conf.append(faces_conf)

            body_imgs = crop_boxes(frame, body_xyxy)
            face_imgs = crop_boxes(frame, faces_xyxy)

            list_body_img.append(body_imgs)
            list_face_img.append(face_imgs)

            num_face.append(len(face_imgs))
            num_body.append(len(body_imgs))

        all_bodys = []
        all_faces = []
        for i in range(frames_cnt):
            all_bodys += list_body_img[i]
            all_faces += list_face_img[i]

        all_body_feature = self.embed_body(all_bodys)
        all_face_feature = self.embed_face(all_faces)
        body_idx = 0
        face_idx = 0

        for i in range(frames_cnt):
            body_features = all_body_feature[body_idx: body_idx + num_body[i]]
            face_features = all_face_feature[face_idx: face_idx + num_face[i]]

            # list_target_body_xyxy_conf.append(
            #     find_targets(target_body_features, body_features, list_body_xyxy[i], body_threshold))
            #
            # list_target_face_xyxy_conf.append(
            #     find_targets(target_face_features, face_features, list_face_xyxy[i], face_threshold))

            body_idx += num_body[i]
            face_idx += num_face[i]

            face_id = []
            body_id = []
            if not face_features == []:
                face_id = face_db.add_vectors(face_features.cpu().numpy(), threshold=0.5)
            if len(body_features) == 2:
                pass
            if not body_features == []:
                body_id = body_db.add_vectors(body_features.cpu().numpy(), threshold=0.6)
            list_face_id.append(face_id)
            list_body_id.append(body_id)


        results = {
            "body_xyxy": list_body_xyxy,  # 人体检测框坐标
            "face_xyxy": list_face_xyxy,  # 人脸检测框坐标
            "body_conf": list_body_conf,  # 人体检测置信度
            "face_conf": list_face_conf,  # 人脸检测置信度
            # "target_body_xyxy_conf": list_target_body_xyxy_conf,
            # "target_face_xyxy_conf": list_target_face_xyxy_conf,
            "face_id": list_face_id,
            "body_id": list_body_id,
        }
        return results



if __name__ == "__main__":
    model = Model(['ALVG'])
    p = '/root/autodl-tmp/frame.png'
    frame = cv2.imread(p)
    model.ALVG.process([frame], 'man')

