import time
import threading
import random
from flask_socketio import emit, join_room, leave_room
from extensions import socketio

# 存储连接的客户端信息
connected_clients = {}
# 人物ID计数器
person_id_counter = 0
# 记录每个摄像头的检测任务
detection_tasks = {}

@socketio.on('connect')
def handle_connect():
    """处理客户端连接"""
    print(f"客户端连接: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    """处理客户端断开连接"""
    print(f"客户端断开连接: {request.sid}")
    # 清理客户端数据
    for camera_id, clients in list(connected_clients.items()):
        if request.sid in clients:
            clients.remove(request.sid)
            if not clients:  # 如果这个摄像头没有客户端了，停止检测任务
                stop_detection_task(camera_id)
                del connected_clients[camera_id]

@socketio.on('join_camera')
def handle_join_camera(data):
    """客户端加入特定摄像头的房间"""
    camera_id = data.get('camera_id')
    if not camera_id:
        emit('error', {'message': '缺少摄像头ID'})
        return
    
    # 将客户端加入摄像头房间
    join_room(camera_id)
    
    # 记录客户端信息
    if camera_id not in connected_clients:
        connected_clients[camera_id] = []
    if request.sid not in connected_clients[camera_id]:
        connected_clients[camera_id].append(request.sid)
    
    # 开始检测任务（如果尚未开始）
    if camera_id not in detection_tasks or not detection_tasks[camera_id].is_alive():
        start_detection_task(camera_id)
    
    emit('joined', {'camera_id': camera_id, 'status': 'success'})

def start_detection_task(camera_id):
    """开始模拟人物检测任务"""
    def detection_loop():
        global person_id_counter
        while camera_id in connected_clients and connected_clients[camera_id]:
            # 模拟检测到新人物
            person_id_counter += 1
            person_data = {
                'id': person_id_counter,
                'camera_id': camera_id,
                'timestamp': time.time(),
                'status': 'normal' if random.random() > 0.2 else 'suspicious',
                'detection_type': 'person'
            }
            
            # 推送检测结果到客户端
            socketio.emit('detection_event', person_data, room=camera_id)
            
            # 随机等待1-2秒
            time.sleep(1 + random.random())
    
    # 创建并启动线程
    thread = threading.Thread(target=detection_loop)
    thread.daemon = True  # 设置为守护线程，这样主程序结束时，线程也会结束
    thread.start()
    detection_tasks[camera_id] = thread

def stop_detection_task(camera_id):
    """停止检测任务（仅标记，线程会自行退出）"""
    if camera_id in detection_tasks:
        del detection_tasks[camera_id]

# 确保所有socketio处理程序都能访问request对象
from flask import request 