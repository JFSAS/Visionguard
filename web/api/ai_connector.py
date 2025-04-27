import time
import threading
import json
import logging
from flask_socketio import SocketIO, emit
from web.extensions import socketio
from ..models.UserCameras import UserCamera
from ..models.DetectionService import DetectionService
from flask import current_app as app

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ai_connector')

# AI服务器连接状态
ai_connections = {}

# 创建单独的命名空间用于AI服务器连接
ai_namespace = '/ai'

@socketio.on('connect', namespace=ai_namespace)
def handle_ai_connect():
    """处理AI服务器连接"""
    client_id = request.sid
    logger.info(f"AI服务器连接: {client_id}")
    emit('connection_response', {'status': 'connected', 'message': '已连接到摄像头服务器'}, namespace=ai_namespace)

@socketio.on('disconnect', namespace=ai_namespace)
def handle_ai_disconnect():
    """处理AI服务器断开连接"""
    client_id = request.sid
    logger.info(f"AI服务器断开连接: {client_id}")
    
    # 清理连接状态
    for camera_id, client in list(ai_connections.items()):
        if client == client_id:
            del ai_connections[camera_id]
            logger.info(f"摄像头 {camera_id} 的AI服务器连接已断开")

@socketio.on('register_camera', namespace=ai_namespace)
def handle_register_camera(data):
    """AI服务器注册摄像头"""
    client_id = request.sid
    camera_id = data.get('camera_id')
    api_key = data.get('api_key')
    
    # 简单的API密钥验证（实际应用中应使用更安全的方法）
    if not api_key or api_key != app.config.get('AI_SERVICE_API_KEY'):
        emit('error', {'message': '认证失败：无效的API密钥'}, namespace=ai_namespace)
        return
    
    if not camera_id:
        emit('error', {'message': '缺少摄像头ID'}, namespace=ai_namespace)
        return
    
    # 检查摄像头是否存在
    camera = UserCamera.query.filter_by(camera_id=camera_id).first()
    if not camera:
        emit('error', {'message': f'摄像头ID不存在: {camera_id}'}, namespace=ai_namespace)
        return
    
    # 记录AI服务器与摄像头的关联
    ai_connections[camera_id] = client_id
    logger.info(f"AI服务器 {client_id} 已注册摄像头 {camera_id}")
    
    emit('registration_success', {
        'camera_id': camera_id,
        'message': f'成功注册摄像头 {camera_id}'
    }, namespace=ai_namespace)

@socketio.on('detection_result', namespace=ai_namespace)
def handle_detection_result(data):
    """处理来自AI服务器的检测结果"""
    client_id = request.sid
    camera_id = data.get('camera_id')
    
    # 验证AI服务器是否已注册此摄像头
    if camera_id not in ai_connections or ai_connections[camera_id] != client_id:
        emit('error', {'message': '未授权的摄像头数据'}, namespace=ai_namespace)
        return
    
    try:
        # 查找对应的摄像头记录
        camera = UserCamera.query.filter_by(camera_id=camera_id).first()
        if not camera:
            emit('error', {'message': f'摄像头不存在: {camera_id}'}, namespace=ai_namespace)
            return
        
        # 将检测结果保存到数据库
        # 1. 使用DetectionService处理检测数据
        frame = DetectionService.process_detection_data(camera.id, data)
        
        # 2. 向前端客户端广播检测结果
        socketio.emit('detection_event', data, room=camera_id)
        
        # 3. 确认接收
        emit('result_received', {
            'status': 'success',
            'timestamp': time.time(),
            'frame_number': data.get('frame_number')
        }, namespace=ai_namespace)
        
        logger.info(f"已处理并保存摄像头 {camera_id} 的第 {data.get('frame_number')} 帧")
        
    except Exception as e:
        logger.error(f"处理检测结果时出错: {str(e)}")
        emit('error', {'message': f'处理检测结果时出错: {str(e)}'}, namespace=ai_namespace)

def init_ai_connector(app):
    """初始化AI连接器"""
    logger.info("初始化AI连接器...")
    
    # # 定期清理旧的检测事件
    # def cleanup_task():
    #     while True:
    #         try:
    #             with app.app_context():
    #                 retention_days = app.config.get('DETECTION_EVENT_RETENTION_DAYS', 7)
    #                 DetectionService.cleanup_old_data(days=retention_days)
    #                 logger.info(f"已清理 {retention_days} 天前的旧检测数据")
    #         except Exception as e:
    #             logger.error(f"清理旧检测数据时出错: {str(e)}")
            
    #         # 每天运行一次
    #         time.sleep(86400)
    
    # # 启动清理任务
    # cleanup_thread = threading.Thread(target=cleanup_task)
    # cleanup_thread.daemon = True
    # cleanup_thread.start()
    
    logger.info("AI连接器初始化完成")

# 确保所有socketio处理程序都能访问request对象
from flask import request 