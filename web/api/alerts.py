from flask import Blueprint, jsonify, request
from datetime import datetime
import random

alerts_bp = Blueprint('alerts', __name__)

# Store some initial alert data
alerts_data = [
    {
        'id': 1,
        'title': '可疑人员出现',
        'time': datetime(2023, 5, 15, 9, 30).isoformat(),
        'content': '监控系统在北区商场检测到与通缉犯相似度达85%的可疑人员，建议派遣警力核查。',
        'location': '北区商场',
        'severity': 'high'
    },
    {
        'id': 2,
        'title': '异常行为检测',
        'time': datetime(2023, 5, 15, 10, 15).isoformat(),
        'content': '东区公园监控发现有人在限制区域逗留时间过长，行为异常，建议关注。',
        'location': '东区公园',
        'severity': 'medium'
    },
    {
        'id': 3,
        'title': '车辆异常聚集', 
        'time': datetime(2023, 5, 15, 11, 45).isoformat(), 
        'content': '西区停车场检测到多辆无牌照车辆聚集，可能存在安全隐患。',
        'location': '西区停车场',
        'severity': 'high'
    },
    {
        'id': 4,
        'title': '人流密度预警',
        'time': datetime(2023, 5, 15, 12, 30).isoformat(),
        'content': '中央广场人流密度超过安全阈值，建议加强现场管控，防止踩踏事件。',
        'location': '中央广场',
        'severity': 'medium'
    },
    {
        'id': 5,
        'title': '设备离线警告',
        'time': datetime(2023, 5, 15, 13, 10).isoformat(),
        'content': '南区3号监控设备离线，请技术人员前往检查。',
        'location': '南区',
        'severity': 'low'
    }
]

@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    """Get all alerts"""
    try:
        return jsonify(alerts_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:alert_id>', methods=['GET'])
def get_alert(alert_id):
    """Get a specific alert by ID"""
    try:
        alert = next((a for a in alerts_data if a['id'] == alert_id), None)
        if alert:
            return jsonify(alert)
        return jsonify({'error': 'Alert not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/generate', methods=['GET'])
def generate_alert():
    """Generate a random new alert"""
    try:
        locations = ['北区商场', '东区公园', '西区停车场', '中央广场', '南区', '市中心', '火车站', '机场']
        titles = ['可疑人员出现', '异常行为检测', '车辆异常聚集', '人流密度预警', '设备离线警告', '区域入侵告警', '物品遗失检测', '交通事故检测']
        severities = ['high', 'medium', 'low']
        
        new_id = max(a['id'] for a in alerts_data) + 1
        new_alert = {
            'id': new_id,
            'title': random.choice(titles),
            'time': datetime.now().isoformat(),
            'content': f'系统检测到{random.choice(locations)}地区发生{random.choice(titles)}事件，请相关人员及时处理。',
            'location': random.choice(locations),
            'severity': random.choice(severities)
        }
        
        # Add the new alert to the beginning of the list
        alerts_data.insert(0, new_alert)
        
        # Keep only the most recent 10 alerts
        while len(alerts_data) > 10:
            alerts_data.pop()
            
        return jsonify(new_alert)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 