from flask import Blueprint, request, jsonify, current_app, send_file
from ..models.DetectionService import DetectionService
from ..models.VideoService import VideoService
import logging
import os

# 设置日志
logger = logging.getLogger('person_trajectory_api')

person_trajectory_bp = Blueprint('person_trajectory', __name__)

@person_trajectory_bp.route('/', methods=['GET'])
def index():
    return 'hello'


@person_trajectory_bp.route('/list', methods=['GET'])
def get_persons_list():
    """获取系统中所有唯一的person_id及其基本信息"""
    try:
        # 获取分页和排序参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        sort_by = request.args.get('sort_by', 'last_seen')
        order = request.args.get('order', 'desc')
        
        # 验证排序字段
        valid_sort_fields = ['last_seen', 'first_seen', 'appearance_count']
        if sort_by not in valid_sort_fields:
            sort_by = 'last_seen'
        
        # 验证排序方式
        valid_orders = ['asc', 'desc']
        if order not in valid_orders:
            order = 'desc'
        
        # 获取人物列表
        persons_data = DetectionService.get_all_unique_persons(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            order=order
        )
        
        # 为每个人物添加缩略图URL
        for person in persons_data['items']:
            person['thumbnail_url'] = f"/api/person_trajectory/person/{person['person_id']}/thumbnail"
        
        return jsonify({
            'success': True,
            'total_count': persons_data['total'],
            'page': persons_data['page'],
            'pages': persons_data['pages'],
            'per_page': persons_data['per_page'],
            'persons': persons_data['items']
        })
    
    except Exception as e:
        logger.error(f"获取人物列表时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/person/<int:person_id>/trajectory', methods=['GET'])
def get_person_trajectory(person_id):
    """获取特定人物的所有出现记录，按时间排序，并进行智能合并"""
    # try:
    # 获取过滤参数
    time_start = request.args.get('time_start', type=float)
    time_end = request.args.get('time_end', type=float)
    camera_id = request.args.get('camera_id', type=int)
    
    # 使用优化版本的轨迹数据获取函数
    trajectory_data = DetectionService.get_person_trajectory(
        person_id=person_id,
        time_start=time_start,
        time_end=time_end,
        camera_id=camera_id
    )
    
    # 为每个合并后的出现事件添加缩略图URL
    for appearance in trajectory_data['appearances']:
        # 使用最佳帧的图像作为缩略图
        appearance['thumbnail_url'] = (
            f"/api/person_trajectory/frame/{appearance['camera_id']}/"
            f"{appearance['best_frame']}/person/{person_id}/image"
        )
        
        # 添加摄像头名称 (从数据库获取)
        from ..models.UserCameras import UserCamera
        camera = UserCamera.query.get(appearance['camera_id'])
        if camera:
            appearance['camera_name'] = camera.camera_name
        else:
            appearance['camera_name'] = f"摄像头 {appearance['camera_id']}"
    
    return jsonify({
        'success': True,
        'person_id': trajectory_data['person_id'],
        'appearance_count': trajectory_data['appearance_count'],  # 现在是合并后的真实出现次数
        'first_seen': trajectory_data['first_seen'],
        'last_seen': trajectory_data['last_seen'],
        'appearances': trajectory_data['appearances']
    })

    # except Exception as e:
    #     logger.error(f"获取人物轨迹时出错: {str(e)}")
    #     return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/person/<int:person_id>/statistics', methods=['GET'])
def get_person_statistics(person_id):
    """获取特定人物的统计信息"""
    try:
        # 获取统计数据
        statistics = DetectionService.get_person_statistics(person_id)
        
        return jsonify({
            'success': True,
            **statistics
        })
    
    except Exception as e:
        logger.error(f"获取人物统计信息时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/person/<int:person_id>/thumbnail', methods=['GET'])
def get_person_thumbnail(person_id):
    """获取特定人物的代表性图像"""
    try:
        # 获取图像路径
        image_path = VideoService.get_person_thumbnail(person_id)
        
        if not image_path or not os.path.exists(image_path):
            return jsonify({'success': False, 'message': 'image_not_exist'}), 404
        
        # 返回图像文件
        return send_file(image_path, mimetype='image/jpeg')
    
    except Exception as e:
        logger.error(f"获取人物缩略图时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/frame/<camera_id>/<int:frame_number>/person/<int:person_id>/image', methods=['GET'])
def get_appearance_image(camera_id, frame_number, person_id):
    """获取特定帧中指定人物的图像"""
    try:

        # 获取图像路径
        image_path = VideoService.get_appearance_image(
            camera_id=camera_id,
            frame_number=frame_number,
            person_id=person_id,
            with_bbox=False
        )
        
        if not image_path or not os.path.exists(image_path):
            return jsonify({'success': False, 'message': '图像不存在'}), 404
        
        # 返回图像文件
        return send_file(image_path, mimetype='image/jpeg')
    
    except Exception as e:
        logger.error(f"获取人物图像时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/person/<int:person_id>/video', methods=['POST'])
def create_person_video(person_id):
    """请求生成特定人物的视频片段"""
    try:
        # 获取请求参数
        request_data = request.get_json()
        if not request_data:
            return jsonify({'success': False, 'message': '请求数据不能为空'}), 400
        
        appearances = request_data.get('appearances')
        time_window = request_data.get('time_window', 5)
        
        # 创建视频生成任务
        task_id = VideoService.create_person_video_task(
            person_id=person_id,
            appearances=appearances,
            time_window=time_window,
            metadata={'user_agent': request.user_agent.string}
        )
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'message': '视频生成任务已创建'
        })
    
    except Exception as e:
        logger.error(f"创建视频生成任务时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/video/status/<task_id>', methods=['GET'])
def get_video_status(task_id):
    """检查视频生成任务的状态"""
    try:
        # 获取任务状态
        task_status = VideoService.get_task_status(task_id)
        
        if not task_status:
            return jsonify({'success': False, 'message': '任务不存在'}), 404
        
        # 构建响应
        response = {
            'success': True,
            'task_id': task_id,
            'status': task_status['status'],
            'progress': task_status['progress']
        }
        
        # 如果任务完成，添加视频URL
        if task_status['status'] == 'completed' and task_status['video_path']:
            video_url = f"/api/person_trajectory/video/download/{task_id}"
            response['video_url'] = video_url
        
        # 如果任务失败，添加错误信息
        if task_status['status'] == 'failed' and task_status['error_message']:
            response['error_message'] = task_status['error_message']
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"获取视频状态时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@person_trajectory_bp.route('/video/download/<task_id>', methods=['GET'])
def download_video(task_id):
    """下载生成完成的视频文件"""
    try:
        # 获取视频路径
        video_path = VideoService.get_video_path(task_id)
        
        if not video_path or not os.path.exists(video_path):
            return jsonify({'success': False, 'message': '视频不存在或尚未生成完成'}), 404
        
        # 返回视频文件
        return send_file(video_path, mimetype='video/mp4', as_attachment=True)
    
    except Exception as e:
        logger.error(f"下载视频时出错: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500 