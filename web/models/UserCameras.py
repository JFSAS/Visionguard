from datetime import datetime
from . import db

class UserCamera(db.Model):
    __tablename__ = 'user_cameras'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    camera_id = db.Column(db.String(64), nullable=False)
    camera_name = db.Column(db.String(128), nullable=False)
    camera_type = db.Column(db.String(20), nullable=False)  # 'rawdata' or 'processed'
    description = db.Column(db.String(255))
    location = db.Column(db.String(128))
    stream_url = db.Column(db.String(255), nullable=False)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    fps = db.Column(db.Float)
    is_active = db.Column(db.Boolean, default=True)
    is_favorite = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_accessed = db.Column(db.DateTime)
    
    # Relationship with User model
    user = db.relationship('User', backref=db.backref('cameras', lazy='dynamic'))
    
    def __init__(self, user_id, camera_id, camera_name, camera_type, stream_url, 
                 description=None, location=None, width=None, height=None, fps=None):
        self.user_id = user_id
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.camera_type = camera_type
        self.stream_url = stream_url
        self.description = description
        self.location = location
        self.width = width
        self.height = height
        self.fps = fps
    
    def update_last_accessed(self):
        self.last_accessed = datetime.utcnow()
        db.session.commit()
    
    def toggle_favorite(self):
        self.is_favorite = not self.is_favorite
        db.session.commit()
    
    def toggle_active(self):
        self.is_active = not self.is_active
        db.session.commit()
    
    def __repr__(self):
        return f'<UserCamera {self.camera_name} ({self.camera_id})>' 