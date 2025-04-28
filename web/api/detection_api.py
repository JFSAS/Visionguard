from flask import Blueprint, request, jsonify, current_app
from ..models.DetectionService import DetectionService
from ..models.UserCameras import UserCamera
import logging

# 设置日志
logger = logging.getLogger('detection_api')

detection_bp = Blueprint('detection', __name__)


@detection_bp.route('/frames/<id>/<int:start_frame>/<int:count>', methods=['GET'])
def get_frames_batch(id, start_frame, count):
    """获取一批帧的检测数据
    
    Args:
        id: 摄像头ID
        start_frame: 起始帧号
        count: 需要获取的帧数量（最大限制50帧）
    """
    try:
        # 限制单次请求帧数量
        max_count = 50
        if count > max_count:
            count = max_count
        
        # 查找摄像头
        camera = UserCamera.query.filter_by(id=id).first()
        if not camera:
            print(f"摄像头不存在: {id}")
            return jsonify({'success': False, 'message': f'camera not exist: {id}'}), 404
        
        # 获取一批帧数据

        frame_data = DetectionService.get_frames_batch(camera.id, start_frame, count)
        
        if not frame_data:
            print(f"未找到有效帧数据: {id}, 起始帧: {start_frame}, 请求数量: {count}")
            return jsonify({'success': False, 'message': 'there is no valid frame data'}), 200
        
        # 添加额外信息
        result = {
            'success': True,
            'start_frame': start_frame,
            'requested_count': count,
            'actual_count': len(frame_data),
            'frames': frame_data
        }
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"get error while process: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@detection_bp.route('/person/<int:person_id>', methods=['GET'])
def get_person(person_id):
    """获取特定人物的历史记录"""
    try:
        # 获取历史记录
        appearances = DetectionService.get_person_history(person_id)
        
        # 转换为JSON友好格式
        result = []
        for app in appearances:
            result.append({
                'camera_id': app.camera_id,
                'frame_number': app.frame_number,
                'timestamp': app.timestamp,
                'bbox': {
                    'x': app.bbox_x,
                    'y': app.bbox_y,
                    'width': app.bbox_width,
                    'height': app.bbox_height
                },
                'status': app.status,
                'confidence': app.confidence
            })
        
        return jsonify({
            'success': True,
            'person_id': person_id,
            'appearance_count': len(result),
            'appearances': result
        })
    
    except Exception as e:
        logger.error(f"获取人物历史时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@detection_bp.route('/face/<int:face_id>', methods=['GET'])
def get_face(face_id):
    """获取特定人脸的历史记录"""
    try:
        # 获取历史记录
        appearances = DetectionService.get_face_history(face_id)
        
        # 转换为JSON友好格式
        result = []
        for app in appearances:
            result.append({
                'camera_id': app.camera_id,
                'frame_number': app.frame_number,
                'timestamp': app.timestamp,
                'bbox': {
                    'x': app.bbox_x,
                    'y': app.bbox_y,
                    'width': app.bbox_width,
                    'height': app.bbox_height
                },
                'status': app.status,
                'confidence': app.confidence
            })
        
        return jsonify({
            'success': True,
            'face_id': face_id,
            'appearance_count': len(result),
            'appearances': result
        })
    
    except Exception as e:
        logger.error(f"获取人脸历史时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500 
    
