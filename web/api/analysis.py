from flask import Blueprint, jsonify, request
from datetime import datetime
import random

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