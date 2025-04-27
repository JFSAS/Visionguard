from datetime import datetime
from . import db
from .DetectionFrames import DetectionFrame
from .PersonAppearances import PersonAppearance
from .FaceAppearances import FaceAppearance
import json

class DetectionService:
    """检测数据处理服务类，提供数据处理和查询工具"""
    
    @staticmethod
    def process_detection_data(detection_data):
        """
        处理检测数据，将数据保存到数据库
        
        参数:
            camera_id: 摄像头数据库ID
            detection_data: AI服务器发送的检测数据JSON
        
        返回:
            保存的DetectionFrame对象
        """
        try:
            # 解析JSON数据
            if isinstance(detection_data, str):
                detection_data = json.loads(detection_data)
            if not isinstance(detection_data, dict):
                raise ValueError("检测数据格式错误，必须为字典类型")
            camera_id = detection_data.get('camera_id') 
            # 1. 保存帧数据
            frame = DetectionFrame(
                camera_id=detection_data.get('camera_id'),
                frame_number=detection_data.get('frame_number'),
                timestamp=detection_data.get('timestamp'),
                person_count=detection_data.get('person_count', 0),
                face_count=detection_data.get('face_count', 0),
                detection_data=detection_data
            )
            db.session.add(frame)
            db.session.flush()  # 获取ID但不提交事务
            
            # 2. 处理人物数据
            if 'persons' in detection_data and detection_data['persons'] and detection_data['person_count'] > 0:
                for person_data in detection_data['persons']:
                    if 'id' not in person_data or 'bbox' not in person_data:
                        continue
                        
                    bbox = person_data['bbox']
                    person = PersonAppearance(
                        person_id=person_data['id'],
                        camera_id=camera_id,
                        frame_number=detection_data['frame_number'],
                        bbox_x=bbox.get('x', 0),
                        bbox_y=bbox.get('y', 0),
                        bbox_width=bbox.get('width', 0),
                        bbox_height=bbox.get('height', 0),
                        status=person_data.get('status'),
                        confidence=person_data.get('confidence'),
                        timestamp=detection_data['timestamp']
                    )
                    db.session.add(person)
            
            # 3. 处理人脸数据
            if "face" in detection_data and detection_data["face"] and detection_data['face_count'] > 0:
                for face_data in detection_data["face"]:
                    if 'id' not in face_data or 'bbox' not in face_data:
                        continue
                        
                    bbox = face_data['bbox']
                    face = FaceAppearance(
                        face_id=face_data['id'],
                        camera_id=camera_id,
                        frame_number=detection_data['frame_number'],
                        bbox_x=bbox.get('x', 0),
                        bbox_y=bbox.get('y', 0),
                        bbox_width=bbox.get('width', 0),
                        bbox_height=bbox.get('height', 0),
                        status=face_data.get('status'),
                        confidence=face_data.get('confidence'),
                        timestamp=detection_data['timestamp']
                    )
                    db.session.add(face)
                    
            # 提交所有变更
            db.session.commit()
            return frame
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def get_frames_batch(camera_id, start_frame, count):
        """批量获取帧数据"""
        end_frame = start_frame + count
        frames = DetectionFrame.query.filter(
            DetectionFrame.camera_id == camera_id,
            DetectionFrame.frame_number >= start_frame,
            DetectionFrame.frame_number < end_frame
        ).order_by(DetectionFrame.frame_number).all()
        
        result = {}
        for frame in frames:
            result[frame.frame_number] = frame.detection_data
        
        return result
    
    @staticmethod
    def get_person_history(person_id):
        """
        获取特定人物的历史记录
        
        参数:
            person_id: 人物ID
            
        返回:
            人物出现记录列表
        """
        return PersonAppearance.get_by_person_id(person_id)
    
    @staticmethod
    def get_face_history(face_id):
        """
        获取特定人脸的历史记录
        
        参数:
            face_id: 人脸ID
            
        返回:
            人脸出现记录列表
        """
        return FaceAppearance.get_by_face_id(face_id)
    
    @staticmethod
    def cleanup_old_data(days=7):
        """
        清理指定天数前的旧数据
        
        参数:
            days: 保留天数
        """
        DetectionFrame.cleanup_old_frames(days)
        PersonAppearance.cleanup_with_frames(days)
        FaceAppearance.cleanup_with_frames(days) 