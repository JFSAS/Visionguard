from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
import random
import re
import os
import tempfile

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/security-briefing', methods=['GET'])
def get_security_briefing():
    """Get security briefing data"""
    try:
        current_date = datetime.now().isoformat()
        
        # Generate random statistics
        stats = {
            'total_alerts': random.randint(15, 30),
            'high_priority': random.randint(3, 8),
            'resolved': random.randint(8, 18),
            'pending': random.randint(5, 12),
            'cameras_online': random.randint(18, 24),
            'success_rate': random.randint(85, 98)
        }
        
        # Incidents list
        incidents = [
            {
                'time': '08:15',
                'description': '北区商场发现可疑人员，已派遣警力核查',
                'severity': 'high'
            },
            {
                'time': '09:30',
                'description': '东区公园监控发现异常行为，已记录备案',
                'severity': 'medium'
            },
            {
                'time': '10:45',
                'description': '西区停车场多辆无牌照车辆聚集，已通知交警部门',
                'severity': 'high'
            },
            {
                'time': '12:30',
                'description': '中央广场人流密度超过安全阈值，已加强现场管控',
                'severity': 'medium'
            },
            {
                'time': '14:10',
                'description': '南区3号监控设备离线，技术人员已前往检查',
                'severity': 'low'
            }
        ]
        
        return jsonify({
            'date': current_date,
            'stats': stats,
            'incidents': incidents
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/case-graph', methods=['GET'])
def get_case_graph():
    """Get case graph data"""
    try:
        # Generate random case data for the graph
        case_types = [
            '可疑人员', '异常行为', '车辆违规', '人流密度', '设备故障', 
            '区域入侵', '物品遗失', '交通事故'
        ]
        
        case_data = []
        for case_type in case_types:
            case_data.append({
                'type': case_type,
                'count': random.randint(5, 30),
                'resolved': random.randint(3, 20)
            })
            
        return jsonify(case_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/confidence-charts', methods=['GET'])
def get_confidence_charts():
    """Get confidence chart data"""
    try:
        # Generate detection confidence data
        months = ['一月', '二月', '三月', '四月', '五月', '六月']
        
        # Person detection confidence over months
        person_confidence = {
            'title': '人员检测置信度',
            'labels': months,
            'data': [random.randint(75, 95) for _ in range(len(months))]
        }
        
        # Vehicle detection confidence over months
        vehicle_confidence = {
            'title': '车辆检测置信度',
            'labels': months,
            'data': [random.randint(80, 98) for _ in range(len(months))]
        }
        
        # Anomaly detection confidence over months
        anomaly_confidence = {
            'title': '异常行为检测置信度',
            'labels': months,
            'data': [random.randint(70, 90) for _ in range(len(months))]
        }
        
        return jsonify({
            'person_confidence': person_confidence,
            'vehicle_confidence': vehicle_confidence,
            'anomaly_confidence': anomaly_confidence
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
    

@analysis_bp.route('/extract-frame-by-time', methods=['GET'])
def extract_frame_by_time():
    """提取指定时间点的视频帧"""
    try:
        # 获取请求参数
        base_time_str = request.args.get('base_time', '2025-04-02 16:27:38.131')
        offset_seconds = float(request.args.get('offset', '0.467'))
        
        # 解析基础时间
        base_time = datetime.strptime(base_time_str, '%Y-%m-%d %H:%M:%S.%f')
        
        # 计算目标时间点
        target_time_seconds = base_time.timestamp() + offset_seconds
        target_time = datetime.fromtimestamp(target_time_seconds)
        
        # 格式化目标时间，用于日志记录
        target_time_str = target_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        
        print(f"正在定位时间点: {target_time_str}")
        
        # 定义FLV文件目录
        flv_dir = '/var/recordings'  # 根据您的实际环境调整
        
        # 查找匹配的FLV文件
        flv_files = []
        file_pattern = re.compile(r'(\d+)-(\d+)-(\d{8})-(\d{6})\.flv$')
        
        for filename in os.listdir(flv_dir):
            if filename.endswith('.flv'):
                match = file_pattern.search(filename)
                if match:
                    # 从文件名解析时间戳
                    file_date = match.group(3)  # 例如 20250402
                    file_time = match.group(4)  # 例如 160450
                    
                    # 转换为datetime对象
                    file_datetime_str = f"{file_date[:4]}-{file_date[4:6]}-{file_date[6:]} {file_time[:2]}:{file_time[2:4]}:{file_time[4:]}"
                    file_datetime = datetime.strptime(file_datetime_str, '%Y-%m-%d %H:%M:%S')
                    
                    # 获取文件大小和修改时间
                    file_path = os.path.join(flv_dir, filename)
                    file_size = os.path.getsize(file_path)
                    file_mtime = os.path.getmtime(file_path)
                    
                    flv_files.append({
                        'filename': filename,
                        'path': file_path,
                        'datetime': file_datetime,
                        'size': file_size,
                        'mtime': file_mtime
                    })
        
        # 根据时间点找出可能包含该帧的文件
        candidates = []
        for file_info in flv_files:
            # 估算文件结束时间 (假设大约10分钟)
            approx_end_time = file_info['datetime'].timestamp() + (file_info['size'] / 1000000)  # 每MB约1秒钟
            
            # 如果目标时间在文件开始和结束时间之间，则为候选文件
            if file_info['datetime'].timestamp() <= target_time_seconds <= approx_end_time:
                candidates.append(file_info)
        
        if not candidates:
            return jsonify({'error': '未找到匹配的FLV文件'}), 404
        
        # 按时间排序候选文件
        candidates.sort(key=lambda x: x['datetime'])
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp:
            temp_filename = temp.name
        
        # 尝试从最可能的候选文件中提取帧
        found = False
        for candidate in candidates:
            try:
                file_path = candidate['path']
                print(f"正在从文件 {candidate['filename']} 中查找")
                
                # 计算在文件中的偏移秒数
                file_offset = target_time_seconds - candidate['datetime'].timestamp()
                
                # 使用FFmpeg直接定位到时间点并提取帧
                import subprocess
                cmd = [
                    'ffmpeg', '-i', file_path, 
                    '-ss', str(file_offset),
                    '-frames:v', '1',
                    '-q:v', '2', 
                    temp_filename,
                    '-y'
                ]
                subprocess.run(cmd, check=True, stderr=subprocess.PIPE)
                
                found = True
                print(f"成功从文件 {candidate['filename']} 的 {file_offset} 秒处提取帧")
                break
                
            except Exception as e:
                print(f"尝试提取 {candidate['filename']} 失败: {str(e)}")
                continue
        
        if not found:
            return jsonify({'error': '未能提取到帧'}), 404
        
        # 返回提取的帧
        return send_file(temp_filename, mimetype='image/jpeg')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500