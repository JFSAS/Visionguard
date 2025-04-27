from .auth import auth_bp, admin_required, login_required
from .cameras import cameras_bp
from .alerts import alerts_bp
from .analysis import analysis_bp
from .user_cameras import user_cameras_bp
from .detection_api import detection_bp

# 可以在这里添加其他初始化内容