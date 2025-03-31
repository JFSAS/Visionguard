import os
from flask import Flask
from extensions import db, cors
from routes import register_blueprints
from api import cameras_bp, auth_bp, alerts_bp, analysis_bp, user_cameras_bp
from config import config

def create_app(config_name='default'):
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    # 加载配置
    app.config.from_object(config[config_name])
    
    # 初始化扩展
    db.init_app(app)
    cors.init_app(app, supports_credentials=True)
    
    # 创建所有表（仅在开发环境使用）
    with app.app_context():
        db.create_all()
    
    # 注册页面路由蓝图
    register_blueprints(app)
    
    # 注册API蓝图
    app.register_blueprint(cameras_bp, url_prefix='/api/cameras')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(analysis_bp, url_prefix='/api/analysis')
    app.register_blueprint(user_cameras_bp, url_prefix='/api/user-cameras')
    # app.register_blueprint(streams_bp, url_prefix='/api/streams')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)