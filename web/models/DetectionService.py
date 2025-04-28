from datetime import datetime
from . import db
from .DetectionFrames import DetectionFrame
from .PersonAppearances import PersonAppearance
from .FaceAppearances import FaceAppearance
from .UserCameras import UserCamera
import json
from sqlalchemy import func, desc

class DetectionService:
    """检测数据处理服务类，提供数据处理和查询工具"""
    
    @staticmethod
    def process_detection_data(detection_data):
        """
        处理检测数据，将数据保存到数据库
        
        参数:
            camera_id: 摄像头数据库ID
            detection_data: AI服务器发送的检测数据JSON
        
        返回:
            保存的DetectionFrame对象
        """
        try:
            # 解析JSON数据
            if isinstance(detection_data, str):
                detection_data = json.loads(detection_data)
            if not isinstance(detection_data, dict):
                raise ValueError("检测数据格式错误，必须为字典类型")
            camera_id = detection_data.get('camera_id') 
            # 1. 保存帧数据
            frame = DetectionFrame(
                camera_id=detection_data.get('camera_id'),
                frame_number=detection_data.get('frame_number'),
                timestamp=detection_data.get('timestamp'),
                person_count=detection_data.get('person_count', 0),
                face_count=detection_data.get('face_count', 0),
                detection_data=detection_data
            )
            db.session.add(frame)
            db.session.flush()  # 获取ID但不提交事务
            
            # 2. 处理人物数据
            if 'persons' in detection_data and detection_data['persons'] and detection_data['person_count'] > 0:
                for person_data in detection_data['persons']:
                    if 'id' not in person_data or 'bbox' not in person_data:
                        continue
                        
                    bbox = person_data['bbox']
                    person = PersonAppearance(
                        person_id=person_data['id'],
                        camera_id=camera_id,
                        frame_number=detection_data['frame_number'],
                        bbox_x=bbox.get('x', 0),
                        bbox_y=bbox.get('y', 0),
                        bbox_width=bbox.get('width', 0),
                        bbox_height=bbox.get('height', 0),
                        status=person_data.get('status'),
                        confidence=person_data.get('confidence'),
                        timestamp=detection_data['timestamp']
                    )
                    db.session.add(person)
            
            # 3. 处理人脸数据
            if "face" in detection_data and detection_data["face"] and detection_data['face_count'] > 0:
                for face_data in detection_data["face"]:
                    if 'id' not in face_data or 'bbox' not in face_data:
                        continue
                        
                    bbox = face_data['bbox']
                    face = FaceAppearance(
                        face_id=face_data['id'],
                        camera_id=camera_id,
                        frame_number=detection_data['frame_number'],
                        bbox_x=bbox.get('x', 0),
                        bbox_y=bbox.get('y', 0),
                        bbox_width=bbox.get('width', 0),
                        bbox_height=bbox.get('height', 0),
                        status=face_data.get('status'),
                        confidence=face_data.get('confidence'),
                        timestamp=detection_data['timestamp']
                    )
                    db.session.add(face)
                    
            # 提交所有变更
            db.session.commit()
            return frame
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def get_frames_batch(camera_id, start_frame, count):
        """批量获取帧数据"""
        end_frame = start_frame + count
        frames = DetectionFrame.query.filter(
            DetectionFrame.camera_id == camera_id,
            DetectionFrame.frame_number >= start_frame,
            DetectionFrame.frame_number < end_frame
        ).order_by(DetectionFrame.frame_number).all()
        
        result = {}
        for frame in frames:
            result[frame.frame_number] = frame.detection_data
        
        return result
    
    @staticmethod
    def get_person_history(person_id):
        """
        获取特定人物的历史记录
        
        参数:
            person_id: 人物ID
            
        返回:
            人物出现记录列表
        """
        return PersonAppearance.get_by_person_id(person_id)
    
    @staticmethod
    def get_face_history(face_id):
        """
        获取特定人脸的历史记录
        
        参数:
            face_id: 人脸ID
            
        返回:
            人脸出现记录列表
        """
        return FaceAppearance.get_by_face_id(face_id)
    
    @staticmethod
    def cleanup_old_data(days=7):
        """
        清理指定天数前的旧数据
        
        参数:
            days: 保留天数
        """
        DetectionFrame.cleanup_old_frames(days)
        PersonAppearance.cleanup_with_frames(days)
        FaceAppearance.cleanup_with_frames(days) 

    @staticmethod
    def get_all_unique_persons(page=1, per_page=20, sort_by='last_seen', order='desc'):
        """
        获取系统中所有唯一的人物ID及其基本信息
        
        参数:
            page: 页码
            per_page: 每页数量
            sort_by: 排序字段
            order: 排序方式 ('asc'或'desc')
            
        返回:
            人物基本信息列表
        """
        # 使用SQL分组和聚合函数获取每个person_id的聚合信息
        query = db.session.query(
            PersonAppearance.person_id,
            func.min(PersonAppearance.timestamp).label('first_seen'),
            func.max(PersonAppearance.timestamp).label('last_seen'),
            func.count(PersonAppearance.id).label('appearance_count')
        ).group_by(PersonAppearance.person_id)
        
        # 根据sort_by和order参数排序
        if sort_by == 'first_seen':
            query = query.order_by(desc('first_seen') if order == 'desc' else 'first_seen')
        elif sort_by == 'appearance_count':
            query = query.order_by(desc('appearance_count') if order == 'desc' else 'appearance_count')
        else:  # 默认按last_seen排序
            query = query.order_by(desc('last_seen') if order == 'desc' else 'last_seen')
        
        # 分页
        paginated_results = query.paginate(page=page, per_page=per_page, error_out=False)
        
        result = []
        for item in paginated_results.items:
            # 获取每个人物最后一次出现的摄像头和帧号
            last_appearance = PersonAppearance.query.filter_by(
                person_id=item.person_id,
                timestamp=item.last_seen
            ).first()
            
            # 构建结果
            person_info = {
                'person_id': item.person_id,
                'first_seen': item.first_seen,
                'last_seen': item.last_seen,
                'appearance_count': item.appearance_count
            }
            
            if last_appearance:
                person_info.update({
                    'last_camera_id': last_appearance.camera_id,
                    'last_frame_number': last_appearance.frame_number
                })
                
                # 获取摄像头名称
                camera = UserCamera.query.get(last_appearance.camera_id)
                if camera:
                    person_info['last_camera_name'] = camera.camera_id
            
            result.append(person_info)
        
        return {
            'items': result,
            'total': paginated_results.total,
            'pages': paginated_results.pages,
            'page': page,
            'per_page': per_page
        }

    @staticmethod
    def get_person_statistics(person_id):
        """
        获取特定人物的统计信息
        
        参数:
            person_id: 人物ID
            
        返回:
            统计信息
        """
        appearances = PersonAppearance.query.filter_by(person_id=person_id).all()
        
        if not appearances:
            return {
                'person_id': person_id,
                'total_appearances': 0,
                'first_seen': None,
                'last_seen': None
            }
        
        # 基本统计
        total_appearances = len(appearances)
        first_seen = min(app.timestamp for app in appearances)
        last_seen = max(app.timestamp for app in appearances)
        
        # 按摄像头统计
        camera_counts = {}
        confidences = []
        for app in appearances:
            camera_id = app.camera_id
            if camera_id not in camera_counts:
                camera_counts[camera_id] = 0
            camera_counts[camera_id] += 1
            
            if app.confidence:
                confidences.append(app.confidence)
        
        # 获取出现次数最多的摄像头
        most_frequent_camera = None
        max_count = 0
        for camera_id, count in camera_counts.items():
            if count > max_count:
                max_count = count
                most_frequent_camera = camera_id
        
        # 获取摄像头名称
        most_frequent_camera_name = None
        if most_frequent_camera:
            camera = UserCamera.query.get(most_frequent_camera)
            if camera:
                most_frequent_camera_name = camera.camera_name
        
        # 平均置信度
        avg_confidence = sum(confidences) / len(confidences) if confidences else None
        
        # 按时间分布统计
        from datetime import datetime
        time_distribution = [0] * 24
        for app in appearances:
            timestamp = app.timestamp
            hour = datetime.fromtimestamp(timestamp).hour
            time_distribution[hour] += 1
        
        hour_distribution = []
        for hour, count in enumerate(time_distribution):
            hour_distribution.append({
                'hour': hour,
                'count': count
            })
        
        return {
            'person_id': person_id,
            'total_appearances': total_appearances,
            'first_seen': first_seen,
            'last_seen': last_seen,
            'most_frequent_camera': {
                'id': most_frequent_camera,
                'name': most_frequent_camera_name,
                'appearances': max_count if most_frequent_camera else 0
            },
            'average_confidence': avg_confidence,
            'time_distribution': hour_distribution
        } 

    @staticmethod
    def merge_appearances_by_time_window(appearances, window_seconds=180):
        """将时间窗口内的连续出现合并为单个事件"""

        if not appearances:
            return []
        
        # 按摄像头ID和时间戳排序
        sorted_apps = sorted(appearances, key=lambda x: (x['camera_id'], x['timestamp']))
        
        merged_events = []
        current_event = {
            'camera_id': sorted_apps[0]['camera_id'],
            'camera_name': sorted_apps[0].get('camera_name'),
            'start_time': sorted_apps[0]['timestamp'],
            'end_time': sorted_apps[0]['timestamp'],
            'frames': [sorted_apps[0]['frame_number']],
            'best_frame': sorted_apps[0]['frame_number'],
            'best_confidence': sorted_apps[0].get('confidence', 0),
            'best_bbox': sorted_apps[0]['bbox']
        }

        for app in sorted_apps[1:]:
            # 如果是同一摄像头且时间间隔在窗口内，合并事件
            if (app['camera_id'] == current_event['camera_id'] and 
                    app['timestamp'] - current_event['end_time'] <= window_seconds):
                # 更新事件结束时间
                current_event['end_time'] = app['timestamp']
                # 添加帧号
                current_event['frames'].append(app['frame_number'])
                # 如果当前帧置信度更高，更新最佳帧
                current_confidence = app.get('confidence', 0)
                if current_confidence and current_confidence > current_event['best_confidence']:
                    current_event['best_confidence'] = current_confidence
                    current_event['best_frame'] = app['frame_number']
                    current_event['best_bbox'] = app['bbox']
            else:
                # 开始新事件，保存当前事件
                merged_events.append(current_event)
                current_event = {
                    'camera_id': app['camera_id'],
                    'camera_name': app.get('camera_name'),
                    'start_time': app['timestamp'],
                    'end_time': app['timestamp'],
                    'frames': [app['frame_number']],
                    'best_frame': app['frame_number'],
                    'best_confidence': app.get('confidence', 0),
                    'best_bbox': app['bbox']
                }
        
        # 添加最后一个事件
        merged_events.append(current_event)
        
        # 计算每个事件的持续时间
        for event in merged_events:
            event['duration'] = event['end_time'] - event['start_time']
            event['frame_count'] = len(event['frames'])
        
        return merged_events
    
        
    @staticmethod
    def get_person_trajectory(person_id, time_start=None, time_end=None, camera_id=None):
        """
        获取特定人物的完整轨迹
        
        参数:
            person_id: 人物ID
            time_start: 起始时间戳
            time_end: 结束时间戳
            camera_id: 摄像头ID
            
        返回:
            人物轨迹信息
        """
        query = PersonAppearance.query.filter_by(person_id=person_id)
        
        # 应用过滤条件
        if time_start is not None:
            query = query.filter(PersonAppearance.timestamp >= time_start)
        if time_end is not None:
            query = query.filter(PersonAppearance.timestamp <= time_end)
        if camera_id is not None:
            query = query.filter(PersonAppearance.camera_id == camera_id)
        
        # 按时间戳排序
        appearances = query.order_by(PersonAppearance.timestamp).all()
        
        # 统计信息
        if appearances:
            first_seen = appearances[0].timestamp
            last_seen = appearances[-1].timestamp
        else:
            first_seen = last_seen = None
        
        # 转换为JSON友好格式
        result = []
        for app in appearances:
            # 获取摄像头名称
            camera_name = None
            camera = UserCamera.query.get(app.camera_id)
            if camera:
                camera_name = camera.camera_name
                
            result.append({
                'camera_id': app.camera_id,
                'camera_name': camera_name,
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
        
        raw_data = {
            'person_id': person_id,
            'appearance_count': len(appearances),
            'first_seen': first_seen,
            'last_seen': last_seen,
            'appearances': result
        }

        merged_events = DetectionService.merge_appearances_by_time_window(raw_data['appearances'])

          
        # 返回优化后的数据
        return {
            'person_id': person_id,
            'appearance_count': len(merged_events),  # 真实出现次数
            'first_seen': raw_data['first_seen'],
            'last_seen': raw_data['last_seen'],
            'appearances': merged_events
        }
    