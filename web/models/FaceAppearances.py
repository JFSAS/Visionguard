from datetime import datetime
from . import db

class FaceAppearance(db.Model):
    __tablename__ = 'face_appearances'
    
    id = db.Column(db.Integer, primary_key=True)
    face_id = db.Column(db.Integer, nullable=False, index=True)  # AI给出的跟踪ID
    camera_id = db.Column(db.Integer, db.ForeignKey('user_cameras.id'), nullable=False)
    frame_number = db.Column(db.Integer, nullable=False)
    bbox_x = db.Column(db.Float, nullable=False)
    bbox_y = db.Column(db.Float, nullable=False)
    bbox_width = db.Column(db.Float, nullable=False)
    bbox_height = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20))
    confidence = db.Column(db.Float)
    timestamp = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    camera = db.relationship('UserCamera', backref=db.backref('face_appearances', lazy='dynamic'))
    
    # 建立复合索引提高查询速度
    __table_args__ = (
        db.Index('idx_face_camera_frame', 'camera_id', 'frame_number'),
    )
    
    def __init__(self, face_id, camera_id, frame_number, bbox_x, bbox_y, bbox_width, 
                bbox_height, status, confidence, timestamp):
        self.face_id = face_id
        self.camera_id = camera_id
        self.frame_number = frame_number
        self.bbox_x = bbox_x
        self.bbox_y = bbox_y
        self.bbox_width = bbox_width
        self.bbox_height = bbox_height
        self.status = status
        self.confidence = confidence
        self.timestamp = timestamp
    
    def __repr__(self):
        return f'<FaceAppearance face_id={self.face_id} camera_id={self.camera_id} frame={self.frame_number}>'
    
    @classmethod
    def get_by_face_id(cls, face_id):
        """获取特定人脸ID的所有出现记录"""
        return cls.query.filter_by(face_id=face_id).order_by(cls.timestamp).all()
    
    @classmethod
    def get_by_frame(cls, camera_id, frame_number):
        """获取特定帧中的所有人脸"""
        return cls.query.filter_by(camera_id=camera_id, frame_number=frame_number).all()
        
    @classmethod
    def cleanup_with_frames(cls, days=7):
        """随帧数据一起清理旧记录"""
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        old_records = cls.query.filter(cls.created_at < cutoff_date).all()
        for record in old_records:
            db.session.delete(record)
        db.session.commit() 