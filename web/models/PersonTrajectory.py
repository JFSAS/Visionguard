from . import db
from datetime import datetime, timedelta

class PersonTrajectory(db.Model):
    __tablename__ = 'person_trajectory_cache'
    
    id = db.Column(db.Integer, primary_key=True)
    person_id = db.Column(db.Integer, nullable=False, index=True)
    time_start = db.Column(db.Float, nullable=True)  # 可选的时间范围筛选
    time_end = db.Column(db.Float, nullable=True)
    camera_id = db.Column(db.Integer, nullable=True)  # 可选的摄像头筛选
    
    # 缓存内容
    first_seen = db.Column(db.Float, nullable=True)
    last_seen = db.Column(db.Float, nullable=True)
    appearance_count = db.Column(db.Integer, nullable=False)
    trajectory_data = db.Column(db.JSON, nullable=False)  # 存储完整的合并后轨迹
    
    # 缓存管理字段
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)  # 缓存过期时间
    
    # 建立索引提高查询效率
    __table_args__ = (
        db.Index('idx_person_filters', 'person_id', 'time_start', 'time_end', 'camera_id'),
    )
    
    def __init__(self, person_id, time_start, time_end, camera_id, trajectory_data, ttl_hours=24):
        self.person_id = person_id
        self.time_start = time_start
        self.time_end = time_end
        self.camera_id = camera_id
        self.trajectory_data = trajectory_data
        self.appearance_count = len(trajectory_data.get('appearances', []))
        self.first_seen = trajectory_data.get('first_seen')
        self.last_seen = trajectory_data.get('last_seen')
        self.expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)
    
    def update_access_time(self):
        self.last_accessed = datetime.utcnow()
        db.session.commit()
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    @classmethod
    def cleanup_expired(cls):
        """清理过期缓存"""
        expired = cls.query.filter(cls.expires_at < datetime.utcnow()).all()
        for cache in expired:
            db.session.delete(cache)
        db.session.commit()
        return len(expired)