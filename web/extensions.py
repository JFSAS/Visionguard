from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO

# 创建扩展实例
db = SQLAlchemy()
cors = CORS()
socketio = SocketIO()