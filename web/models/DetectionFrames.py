from datetime import datetime
from . import db

class DetectionFrame(db.Model):
    __tablename__ = 'detection_frames'
    
    id = db.Column(db.Integer, primary_key=True)
    camera_id = db.Column(db.Integer, db.ForeignKey('user_cameras.id'), nullable=False)
    frame_number = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.Float, nullable=False)
    person_count = db.Column(db.Integer, default=0)
    face_count = db.Column(db.Integer, default=0)
    detection_data = db.Column(db.JSON, nullable=False)  # 存储完整的JSON数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    camera = db.relationship('UserCamera', backref=db.backref('detection_frames', lazy='dynamic'))
    
    # 确保camera_id和frame_number的组合唯一
    __table_args__ = (
        db.UniqueConstraint('camera_id', 'frame_number', name='uix_camera_frame'),
    )
    
    def __init__(self, camera_id, frame_number, timestamp, person_count, face_count, detection_data):
        self.camera_id = camera_id
        self.frame_number = frame_number
        self.timestamp = timestamp
        self.person_count = person_count
        self.face_count = face_count
        self.detection_data = detection_data
    
    def __repr__(self):
        return f'<DetectionFrame camera_id={self.camera_id} frame={self.frame_number}>'
        
    @classmethod
    def get_frame(cls, camera_id, frame_number):
        """获取特定摄像头的特定帧"""
        return cls.query.filter_by(camera_id=camera_id, frame_number=frame_number).first()
        
    @classmethod
    def cleanup_old_frames(cls, days=7):
        """清理指定天数前的旧检测帧"""
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        old_frames = cls.query.filter(cls.created_at < cutoff_date).all()
        for frame in old_frames:
            db.session.delete(frame)
        db.session.commit() 