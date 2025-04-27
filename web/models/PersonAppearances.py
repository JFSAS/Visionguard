from datetime import datetime
from . import db

class PersonAppearance(db.Model):
    __tablename__ = 'person_appearances'
    
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, nullable=False, index=True)  # AI给出的跟踪ID
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
    camera = db.relationship('UserCamera', backref=db.backref('person_appearances', lazy='dynamic'))
    
    # 建立复合索引提高查询速度 - 修改索引名称添加表名前缀
    __table_args__ = (
        db.Index('idx_person_camera_frame', 'camera_id', 'frame_number'),
    )
    
    def __init__(self, person_id, camera_id, frame_number, bbox_x, bbox_y, bbox_width, 
                bbox_height, status, confidence, timestamp):
        self.person_id = person_id
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
        return f'<PersonAppearance person_id={self.person_id} camera_id={self.camera_id} frame={self.frame_number}>'
    
    @classmethod
    def get_by_person_id(cls, person_id):
        """获取特定人物ID的所有出现记录"""
        return cls.query.filter_by(person_id=person_id).order_by(cls.timestamp).all()
    
    @classmethod
    def get_by_frame(cls, camera_id, frame_number):
        """获取特定帧中的所有人物"""
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