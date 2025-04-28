from .auth import login_bp
from .dashboard import dashboard_bp
from .camera_management import camera_management_bp

def register_blueprints(app):
    app.register_blueprint(login_bp, url_prefix='/')
    app.register_blueprint(dashboard_bp, url_prefix='/')
    app.register_blueprint(camera_management_bp, url_prefix='/')
