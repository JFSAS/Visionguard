from flask import Blueprint, render_template, session, g
from web.api import login_required
from web.models import UserCamera

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard')
@login_required
def index():
    """用户仪表盘（受保护的页面）"""
    username = session.get('username')
    
    # 获取用户监控数量
    try:
        camera_count = UserCamera.query.filter_by(user_id=g.user.id).count()
    except (AttributeError, Exception) as e:
        # 如果g.user不存在或查询出错，设置默认值为0
        camera_count = 0
    
    return render_template('index.html', username=username, camera_count=camera_count)

@dashboard_bp.route('/analysis')
@login_required
def analysis():
    """分析页面（受保护的页面）"""
    return render_template('analysis.html')

@dashboard_bp.route('/monitor-detail')
@login_required
def monitor_detail():
    """监控详情页面（受保护的页面）"""
    return render_template('monitor-detail.html')

@dashboard_bp.route('/profile')
@login_required
def profile():
    """用户个人资料页面（受保护的页面）"""
    return render_template('profile.html')

    # 人物轨迹数据库页面
@dashboard_bp.route('/person_trajectory')
@login_required
def person_trajectory():
    return render_template('person_trajectory.html')