from flask import Blueprint, render_template, session, request
from web.api import login_required

camera_management_bp = Blueprint('camera_management', __name__)

@camera_management_bp.route('/camera-management')
@login_required
def camera_management():
    """摄像头管理页面（受保护的页面）"""
    username = session.get('username')
    return render_template('camera-management.html', username=username)

@camera_management_bp.route('/add-camera')
@login_required
def add_camera():
    """添加摄像头页面（受保护的页面）"""
    username = session.get('username')
    return render_template('add-camera.html', username=username)

@camera_management_bp.route('/edit-camera/<int:camera_id>')
@login_required
def edit_camera(camera_id):
    """编辑摄像头页面（受保护的页面）"""
    username = session.get('username')
    return render_template('edit-camera.html', username=username, camera_id=camera_id)

@camera_management_bp.route('/preview-camera')
@login_required
def preview_camera():
    """预览摄像头页面（受保护的页面）"""
    stream_url = request.args.get('stream_url', '')
    camera_type = request.args.get('camera_type', 'rawdata')
    username = session.get('username')
    return render_template('preview-camera.html', 
                           username=username, 
                           stream_url=stream_url, 
                           camera_type=camera_type) 