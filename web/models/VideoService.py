import os
import uuid
import cv2
import time
import json
import threading
import logging
from pathlib import Path
from datetime import datetime
from . import db
from .DetectionFrames import DetectionFrame
from .PersonAppearances import PersonAppearance
from .UserCameras import UserCamera
from web.script.VideoFrameEncoder import VideoFrameEncoder

# 设置日志
logger = logging.getLogger('video_service')

class VideoTask:
    """视频生成任务类"""
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    
    def __init__(self, task_id, person_id, appearances, time_window=5, metadata=None):
        self.task_id = task_id
        self.person_id = person_id
        self.appearances = appearances  # 需要包含的出现记录列表
        self.time_window = time_window  # 前后扩展时间，单位秒
        self.status = self.STATUS_PENDING
        self.progress = 0
        self.video_path = None
        self.error_message = None
        self.created_at = datetime.now()
        self.completed_at = None
        self.metadata = metadata or {}
    
    def to_dict(self):
        """转换为字典表示"""
        return {
            'task_id': self.task_id,
            'person_id': self.person_id,
            'appearances': self.appearances,
            'time_window': self.time_window,
            'status': self.status,
            'progress': self.progress,
            'video_path': self.video_path,
            'error_message': self.error_message,
            'created_at': self.created_at.timestamp() if self.created_at else None,
            'completed_at': self.completed_at.timestamp() if self.completed_at else None,
            'metadata': self.metadata
        }

class VideoService:
    """视频处理服务类，提供视频生成和管理功能"""
    
    # 存储所有任务
    _tasks = {}
    # 视频文件存储目录
    VIDEO_OUTPUT_DIR = 'static/videos/generated'
    # 视频文件过期时间（秒），默认1天
    VIDEO_EXPIRY_TIME = 86400
    
    @classmethod
    def init_app(cls, app):
        """初始化服务"""
        # 确保视频输出目录存在
        video_dir = os.path.join(app.root_path, cls.VIDEO_OUTPUT_DIR)
        os.makedirs(video_dir, exist_ok=True)
        
        # 设置视频文件过期时间
        if app.config.get('VIDEO_EXPIRY_TIME'):
            cls.VIDEO_EXPIRY_TIME = app.config.get('VIDEO_EXPIRY_TIME')
        
        # 启动定时清理任务
        cleanup_thread = threading.Thread(target=cls._cleanup_old_videos, daemon=True)
        cleanup_thread.start()
    
    @classmethod
    def _cleanup_old_videos(cls):
        """定期清理过期视频文件"""
        while True:
            try:
                current_time = time.time()
                expired_tasks = []
                
                # 查找过期任务
                for task_id, task in cls._tasks.items():
                    if task.status == VideoTask.STATUS_COMPLETED and task.completed_at:
                        task_age = current_time - task.completed_at.timestamp()
                        if task_age > cls.VIDEO_EXPIRY_TIME:
                            expired_tasks.append(task_id)
                
                # 删除过期任务和文件
                for task_id in expired_tasks:
                    task = cls._tasks.pop(task_id, None)
                    if task and task.video_path and os.path.exists(task.video_path):
                        try:
                            os.remove(task.video_path)
                            logger.info(f"已删除过期视频: {task.video_path}")
                        except Exception as e:
                            logger.error(f"删除过期视频失败: {e}")
                
                # 休眠一段时间
                time.sleep(3600)  # 每小时检查一次
            except Exception as e:
                logger.error(f"清理过期视频时出错: {e}")
                time.sleep(3600)  # 错误恢复
    
    @classmethod
    def create_person_video_task(cls, person_id, appearances=None, time_window=5, metadata=None):
        """
        创建人物视频生成任务
        
        参数:
            person_id: 人物ID
            appearances: 要包含的出现记录ID列表，如果为None则包含所有记录
            time_window: 每段记录前后扩展的时间窗口（秒）
            metadata: 额外元数据
            
        返回:
            任务ID
        """
        # 如果未指定出现记录，则获取所有记录
        if appearances is None:
            person_appearances = PersonAppearance.query.filter_by(person_id=person_id) \
                                                .order_by(PersonAppearance.timestamp).all()
            appearances = [app.id for app in person_appearances]
        
        # 创建唯一任务ID
        task_id = str(uuid.uuid4())
        
        # 创建任务
        task = VideoTask(
            task_id=task_id,
            person_id=person_id,
            appearances=appearances,
            time_window=time_window,
            metadata=metadata
        )
        
        # 存储任务
        cls._tasks[task_id] = task
        
        # 启动异步处理线程
        processing_thread = threading.Thread(
            target=cls._process_video_task,
            args=(task_id,),
            daemon=True
        )
        processing_thread.start()
        
        return task_id
    
    @classmethod
    def _process_video_task(cls, task_id):
        """
        处理视频生成任务（异步）
        
        参数:
            task_id: 任务ID
        """
        task = cls._tasks.get(task_id)
        if not task:
            logger.error(f"任务不存在: {task_id}")
            return
        
        try:
            # 更新任务状态
            task.status = VideoTask.STATUS_PROCESSING
            task.progress = 0
            
            # 获取出现记录
            appearance_records = []
            for appearance_id in task.appearances:
                appearance = PersonAppearance.query.get(appearance_id)
                if appearance:
                    appearance_records.append(appearance)
            
            if not appearance_records:
                raise ValueError("未找到有效的出现记录")
            
            # 按时间戳排序
            appearance_records.sort(key=lambda x: x.timestamp)
            
            # TODO: 实现视频生成逻辑
            # 1. 根据camera_id和frame_number找到原始视频
            # 2. 根据timestamp和time_window确定每段视频的起止时间
            # 3. 提取视频片段并合成
            
            # 模拟处理过程
            total_steps = len(appearance_records)
            for i, _ in enumerate(appearance_records):
                # 更新进度
                task.progress = int((i + 1) / total_steps * 100)
                time.sleep(0.1)  # 模拟处理时间
            
            # 设置生成的视频文件路径
            output_filename = f"person_{task.person_id}_{int(time.time())}.mp4"
            task.video_path = os.path.join(cls.VIDEO_OUTPUT_DIR, output_filename)
            
            # 更新任务状态为完成
            task.status = VideoTask.STATUS_COMPLETED
            task.progress = 100
            task.completed_at = datetime.now()
            
            logger.info(f"视频生成任务完成: {task_id}")
            
        except Exception as e:
            logger.error(f"视频生成失败: {e}")
            task.status = VideoTask.STATUS_FAILED
            task.error_message = str(e)
    
    @classmethod
    def get_task_status(cls, task_id):
        """
        获取任务状态
        
        参数:
            task_id: 任务ID
            
        返回:
            任务状态字典，如果任务不存在则返回None
        """
        task = cls._tasks.get(task_id)
        if not task:
            return None
        
        return task.to_dict()
    
    @classmethod
    def get_video_path(cls, task_id):
        """
        获取生成的视频文件路径
        
        参数:
            task_id: 任务ID
            
        返回:
            视频文件路径，如果视频未生成或任务不存在则返回None
        """
        task = cls._tasks.get(task_id)
        if not task or task.status != VideoTask.STATUS_COMPLETED or not task.video_path:
            return None
        
        return task.video_path
    

    @classmethod
    def get_person_thumbnail(cls, person_id):
        """
        获取人物的代表性图像（选择最清晰的一张）
        
        参数:
            person_id: 人物ID
                
        返回:
            图像文件路径，如果生成失败则返回None
        """
        try:
            # 修改为查找bbox_height最大的人物记录
            appearance = PersonAppearance.query.filter_by(person_id=person_id) \
                                        .order_by(PersonAppearance.bbox_height.desc()) \
                                        .first()
            
            if not appearance:
                logger.warning(f"未找到人物ID: {person_id}")
                return "static/images/person_placeholder.jpg"
            
            # 使用get_appearance_image获取图像
            return cls.get_appearance_image(
                appearance.camera_id, 
                appearance.frame_number,
                person_id,
                with_bbox=False
            )
                
        except Exception as e:
            logger.error(f"获取人物缩略图失败: {e}")
            return "static/images/person_placeholder.jpg"
    
    @classmethod
    def get_appearance_image(cls, camera_id, frame_number, person_id, with_bbox=False):
        """
        获取特定帧中指定人物的图像
        
        参数:
            camera_id: 摄像头ID
            frame_number: 帧号
            person_id: 人物ID
            with_bbox: 是否绘制检测框
            
        返回:
            图像文件路径，如果生成失败则返回None
        """
        try:
            # 先查找缓存目录中是否已存在该人物图像
            person_img_dir = os.path.join('static', 'images', 'persons')
            os.makedirs(person_img_dir, exist_ok=True)
            
            # 检查代表图像是否已存在
            image_filename = f"person_{person_id}_{frame_number}.jpg"
            image_path = os.path.join(person_img_dir, image_filename)
            
            if os.path.exists(image_path):
                logger.debug(f"找到已缓存的人物图像: {image_path}")
                return image_path
            
            # 查找对应的人物出现记录
            appearance = PersonAppearance.query.filter_by(
                camera_id=camera_id,
                frame_number=frame_number,
                person_id=person_id
            ).first()

            if not appearance:
                logger.warning(f"未找到人物ID: {person_id}的任何记录")
                return "static/images/person_placeholder.jpg"
        
            # 构建视频文件路径
            camera = UserCamera.query.get(camera_id)
            if not camera:
                logger.error(f"摄像头ID不存在: {camera_id}")
                return "static/images/person_placeholder.jpg"

            camera_name = camera.camera_id 
            video_path = os.path.join('static', 'videos', f"{camera_name}.mp4")
            if not os.path.exists(video_path):
                logger.error(f"视频文件不存在: {video_path}")
                return "static/images/person_placeholder.jpg"
            
            # 打开视频文件
            video_cap = cv2.VideoCapture(video_path)
            if not video_cap.isOpened():
                logger.error(f"无法打开视频文件: {video_path}")
                return "static/images/person_placeholder.jpg"
            
            # 优化帧查找逻辑，先尝试直接跳转，再进行精确查找
            encoder = VideoFrameEncoder()
            target_frame = appearance.frame_number
            found_frame = False

            # 1. 首先尝试直接跳转到目标帧附近
            # 假设帧号与视频中的实际位置可能存在轻微偏差，先跳到稍早的位置
            jump_position = max(0, target_frame - 5)  # 跳到目标帧前5帧的位置
            video_cap.set(cv2.CAP_PROP_POS_FRAMES, jump_position)

            # 2. 从跳转位置开始，读取一定范围的帧并检查
            frame_count = jump_position
            search_range = 20  # 搜索范围：向后搜索20帧
                        
            for _ in range(search_range):
                ret, frame = video_cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # 解码每一帧的帧号
                try:
                    decoded_frame_number = encoder.decode_frame(frame)
                    logger.debug(f"解码帧 {frame_count}, 解码结果: {decoded_frame_number}")
                    
                    # 找到目标帧
                    if decoded_frame_number == target_frame:
                        found_frame = True
                        break
                    
                    # 如果解码的帧号远大于目标帧，可能是跳过了目标帧
                    if decoded_frame_number > target_frame + 10:
                        logger.warning(f"跳过了目标帧 {target_frame}，当前解码帧号为 {decoded_frame_number}")
                        break
                except Exception as decode_error:
                    logger.debug(f"解码帧 {frame_count} 失败: {str(decode_error)}")
                    continue

            
            # 如果未能找到目标帧
            if not found_frame:
                logger.warning(f"无法找到视频中的帧号 {target_frame}")
                video_cap.release()
                return "static/images/person_placeholder.jpg"
            
            # 从帧中裁剪出人物
            x, y, w, h = int(appearance.bbox_x), int(appearance.bbox_y), int(appearance.bbox_width), int(appearance.bbox_height)
            
            # 确保边界框在图像内
            frame_h, frame_w = frame.shape[:2]
            x = max(0, min(x, frame_w - 1))
            y = max(0, min(y, frame_h - 1))
            w = min(w, frame_w - x)
            h = min(h, frame_h - y)
            
            if w <= 0 or h <= 0:
                logger.error(f"无效的边界框: x={x}, y={y}, w={w}, h={h}")
                video_cap.release()
                return "static/images/person_placeholder.jpg"
            
            # 裁剪人物区域，可适当扩大区域以包含更完整的人物
            # 添加10%的边缘扩展
            margin_x = int(w * 0.1)
            margin_y = int(h * 0.1)
            crop_x = max(0, x - margin_x)
            crop_y = max(0, y - margin_y)
            crop_w = min(frame_w - crop_x, w + 2 * margin_x)
            crop_h = min(frame_h - crop_y, h + 2 * margin_y)
            
            person_img = frame[crop_y:crop_y+crop_h, crop_x:crop_x+crop_w].copy()
            
            if with_bbox:
                # 在裁剪后的图像上绘制边界框
                relative_x = x - crop_x
                relative_y = y - crop_y
                cv2.rectangle(person_img, (relative_x, relative_y), (relative_x + w, relative_y + h), (0, 255, 0), 2)
                
                # 添加ID标签
                cv2.putText(
                    person_img, 
                    f"ID:{person_id}", 
                    (relative_x, relative_y - 5), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    0.5, 
                    (0, 255, 0), 
                    1
                )
            
            # 保存图像
            cv2.imwrite(image_path, person_img)
            logger.info(f"已保存人物图像: {image_path}")
            
            # 释放视频资源
            video_cap.release()
            
            return image_path
                
        except Exception as e:
            logger.error(f"获取人物图像失败: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return "static/images/person_placeholder.jpg"