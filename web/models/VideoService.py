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
    def create_person_segment_task(cls, person_id, camera_id, start_time, end_time, metadata=None):
        """
        创建人物视频片段生成任务
        
        参数:
            person_id: 人物ID
            camera_id: 摄像头ID
            start_time: 起始时间戳
            end_time: 结束时间戳
            metadata: 额外元数据
            
        返回:
            任务ID
        """
        # 创建唯一任务ID
        task_id = str(uuid.uuid4())
        
        # 创建任务
        task = VideoTask(
            task_id=task_id,
            person_id=person_id,
            appearances=[],  # 这里不用appearances列表，而是使用时间范围
            time_window=0,  # 不需要时间窗口扩展
            metadata={
                'camera_id': camera_id,
                'start_time': start_time,
                'end_time': end_time,
                **(metadata or {})
            }
        )
        logger.info(f"person_id:{person_id}创建视频分割任务: {task.task_id}")
        # 存储任务
        cls._tasks[task_id] = task

        from flask import current_app
        app = current_app._get_current_object()
        # 启动异步处理线程
        processing_thread = threading.Thread(
            target=cls._process_segment_task,
            args=(task_id, app),
            daemon=True
        )
        processing_thread.start()
        
        return task_id

    @classmethod
    def _process_segment_task(cls, task_id, app):
        """
        处理视频片段生成任务（异步）
        
        参数:
            task_id: 任务ID
        """
        
        task : VideoTask = cls._tasks.get(task_id)
        if not task:
            logger.error(f"任务不存在: {task_id}")
            return

        # 创建应用上下文
        with app.app_context():
            try:
                # 更新任务状态
                task.status = VideoTask.STATUS_PROCESSING
                task.progress = 0
                
                # 从元数据中获取参数
                camera_id = task.metadata.get('camera_id')
                start_time = task.metadata.get('start_time')
                end_time = task.metadata.get('end_time')
                person_id = task.person_id
                
                if not camera_id or start_time is None or end_time is None:
                    raise ValueError("缺少必要参数")
                
                


                # 检查原始视频视频文件路径
                camera = UserCamera.query.get(camera_id)
                camera_name = camera.camera_id
                video_path = os.path.join("static", "videos", f"{camera_name}.mp4")
                if not os.path.exists(video_path):
                    logger.error(f"原始视频文件不存在，{video_path}")
                    return 


                # 检查输出文件
                output_dir = os.path.join("static", "videos", f"{task.person_id}_segment")
                if not os.path.exists(output_dir):
                    os.mkdir(output_dir)

                output_path = os.path.join(output_dir, f"{camera_id}_{start_time}_{end_time}.mp4")

                if os.path.exists(output_path):
                    # 更新任务状态为完成
                    task.video_path = output_path
                    task.status = VideoTask.STATUS_COMPLETED
                    task.progress = 100
                    task.completed_at = datetime.now()
                    return


                # 通过时间戳查询对应的帧号
                start_frame_record = PersonAppearance.query.filter(
                    PersonAppearance.camera_id == camera_id,
                    PersonAppearance.timestamp >= start_time
                ).order_by(PersonAppearance.timestamp.asc()).first()
                
                end_frame_record = PersonAppearance.query.filter(
                    PersonAppearance.camera_id == camera_id,
                    PersonAppearance.timestamp <= end_time
                ).order_by(PersonAppearance.timestamp.desc()).first()
                
                if not start_frame_record or not end_frame_record:
                    raise ValueError("未找到指定时间范围内的帧记录")
                
                start_frame = start_frame_record.frame_number
                end_frame = end_frame_record.frame_number
                
                logger.info(f"开始处理视频片段，帧范围: {start_frame} - {end_frame}")
                
                # 查询该人物在时间范围内的所有出现记录
                person_records = PersonAppearance.query.filter(
                    PersonAppearance.person_id == person_id,
                    PersonAppearance.camera_id == camera_id,
                    PersonAppearance.timestamp >= start_time,
                    PersonAppearance.timestamp <= end_time
                ).order_by(PersonAppearance.timestamp.asc()).all()
                
                if not person_records:
                    raise ValueError("未找到该人物在指定时间范围内的出现记录")
                
                # 将人物记录转换为帧号到边界框的映射
                frame_to_bbox = {}
                for record in person_records:
                    frame_to_bbox[record.frame_number] = {
                        'x': record.bbox_x,
                        'y': record.bbox_y,
                        'width': record.bbox_width,
                        'height': record.bbox_height,
                        'confidence': record.confidence
                    }
                
                
                # 生成视频片段并添加检测框
                success = cls._generate_video_segment(
                    video_path=video_path,
                    output_path=output_path,
                    start_frame=start_frame,
                    end_frame=end_frame,
                    frame_to_bbox=frame_to_bbox,
                    task=task
                )
                
                if not success:
                    raise ValueError("视频片段生成失败")
                
                # 更新任务状态为完成
                task.video_path = output_path
                task.status = VideoTask.STATUS_COMPLETED
                task.progress = 100
                task.completed_at = datetime.now()
                
                logger.info(f"视频片段生成任务完成: {task_id}, 输出: {output_path}")
                return
                
            except Exception as e:
                logger.error(f"视频片段生成失败: {e}")
                logger.exception(e)
                task.status = VideoTask.STATUS_FAILED
                task.error_message = str(e)

    @classmethod
    def _generate_video_segment(cls, video_path, output_path, start_frame, end_frame, frame_to_bbox, task):
        """
        生成视频片段并添加检测框
        
        参数:
            video_path: 原始视频路径
            output_path: 输出视频路径
            start_frame: 起始帧号
            end_frame: 结束帧号
            frame_to_bbox: 帧号到边界框的映射
            task: 任务对象，用于更新进度
        
        返回:
            成功生成返回True，否则返回False
        """
        try:
            # 创建视频帧编码器，用于在视频中解码帧号
            encoder = VideoFrameEncoder()
            
            # 打开视频文件
            video_cap = cv2.VideoCapture(video_path)
            if not video_cap.isOpened():
                logger.error(f"无法打开视频文件: {video_path}")
                return False
            
            # 获取视频信息
            fps = video_cap.get(cv2.CAP_PROP_FPS)
            width = int(video_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(video_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(video_cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # 创建视频写入器
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            # 计算需要处理的总帧数
            frames_to_process = end_frame - start_frame + 1
            
            # 将视频跳转到大致起始位置（减去一些帧以确保不会错过起始帧）
            safety_margin = 30  # 安全边际，避免跳过目标帧
            seek_position = max(0, start_frame - safety_margin)
            video_cap.set(cv2.CAP_PROP_POS_FRAMES, seek_position)
            
            # 初始化变量
            processed_frames = 0
            current_frame_count = seek_position
            start_found = False
            end_reached = False
            
            # 处理视频帧
            while not end_reached and video_cap.isOpened():
                ret, frame = video_cap.read()
                if not ret:
                    break
                    
                current_frame_count += 1
                
                # 获取当前帧的帧号
                try:
                    decoded_frame_number = encoder.decode_frame(frame)
                    
                    # 如果解码失败，使用估计的帧号
                    if decoded_frame_number is None:
                        decoded_frame_number = current_frame_count
                        logger.warning(f"无法解码帧 {current_frame_count}，使用估计帧号")
                    
                except Exception as e:
                    logger.debug(f"解码帧 {current_frame_count} 失败: {str(e)}")
                    decoded_frame_number = current_frame_count
                
                # 检查是否到达起始帧
                if not start_found:
                    if decoded_frame_number >= start_frame:
                        start_found = True
                    else:
                        continue  # 跳过起始帧之前的帧
                
                # 检查是否超过结束帧
                if decoded_frame_number > end_frame:
                    end_reached = True
                    break
                    
                # 处理找到的帧
                if start_found:
                    # 如果当前帧有检测框，添加到视频中
                    if decoded_frame_number in frame_to_bbox:
                        bbox = frame_to_bbox[decoded_frame_number]
                        x, y = int(bbox['x']), int(bbox['y'])
                        w, h = int(bbox['width']), int(bbox['height'])
                        
                        # 画矩形框红色
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                        
                        # 添加人物ID和置信度
                        label = f"ID:{task.person_id}"
                        if bbox.get('confidence'):
                            label += f" {int(bbox['confidence'] * 100)}%"
                            
                        # 绘制标签背景
                        cv2.rectangle(frame, (x, y - 30), (x + len(label) * 10, y), (0, 0, 0), -1)
                        # 绘制标签文字
                        cv2.putText(frame, label, (x + 5, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                    
                    # 将帧写入输出视频
                    out.write(frame)
                    processed_frames += 1
                    
                    # 更新进度
                    if frames_to_process > 0:
                        progress = min(int((processed_frames / frames_to_process) * 100), 99)
                        task.progress = progress
                        
                        # 每处理10帧打印一次日志
                        if processed_frames % 10 == 0:
                            logger.debug(f"视频处理进度: {progress}%, 帧 {decoded_frame_number}/{end_frame}")
            
            # 释放资源
            video_cap.release()
            out.release()
            
            # 检查是否成功处理了足够的帧
            if processed_frames < 1:
                logger.error("处理的帧数过少，可能找不到目标帧")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"生成视频片段失败: {e}")
            logger.exception(e)
            return False
    
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