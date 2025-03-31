from flask import Blueprint, render_template, redirect, url_for, session

login_bp = Blueprint('login', __name__)

@login_bp.route('/')
def index():
    """根路由，将未登录用户引导至登录页面，已登录用户引导至首页"""
    if 'user_id' in session:
        return redirect(url_for('dashboard.index'))
    return redirect(url_for('login.login_page'))

@login_bp.route('/login')
def login_page():
    """登录页面"""
    if 'user_id' in session:
        return redirect(url_for('dashboard.index'))
    return render_template('login.html')

@login_bp.route('/register')
def register_page():
    """注册页面"""
    if 'user_id' in session:
        return redirect(url_for('dashboard.index'))
    return render_template('register.html')