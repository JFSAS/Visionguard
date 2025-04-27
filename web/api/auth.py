from flask import Blueprint, request, jsonify, current_app, session, redirect, url_for, g
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
import datetime
from functools import wraps
from web.models import db, User

auth_bp = Blueprint('auth', __name__)

# JWT配置
def get_secret_key():
    return current_app.config['SECRET_KEY']

def generate_token(user):
    payload = {
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, get_secret_key(), algorithm='HS256')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not username or not email or not password:
        return jsonify({'message': '请填写所有必填字段'}), 400
    
    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({'message': '用户名已存在'}), 400
    
    # 检查邮箱是否已存在
    if User.query.filter_by(email=email).first():
        return jsonify({'message': '邮箱已被注册'}), 400
    
    # 创建新用户
    try:
        new_user = User(
            username=username,
            email=email,
            password=password
        )
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': '注册成功',
            'user_id': new_user.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'注册失败: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': '用户名和密码不能为空'}), 400

    # 查找用户
    user = User.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        # 更新登录时间
        user.update_last_login()
        
        # 生成JWT令牌
        token = generate_token(user)
        
        # 设置session
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        
        return jsonify({
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            },
            'message': '登录成功'
        })
    
    return jsonify({'message': '用户名或密码错误'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': '已成功登出'}), 200

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # 检查session中是否有用户ID
        if 'user_id' not in session:
            return redirect(url_for('login.login_page'))
        
        # 获取当前用户并设置到g对象中
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user:
            session.clear()
            return redirect(url_for('login.login_page'))
        
        g.user = user
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login.login_page'))
        
        # 获取当前用户并设置到g对象中
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if not user:
            session.clear()
            return redirect(url_for('login.login_page'))
        
        g.user = user
        
        if user.role != 'admin':
            return jsonify({'message': '需要管理员权限'}), 403
            
        return f(*args, **kwargs)
    return decorated 