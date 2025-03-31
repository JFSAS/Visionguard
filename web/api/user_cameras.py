from flask import Blueprint, jsonify, request, g
from models import db, UserCamera
from api.auth import login_required
import json

user_cameras_bp = Blueprint('user_cameras', __name__)

@user_cameras_bp.route('/', methods=['GET'])
@login_required
def get_user_cameras():
    """Get all cameras for the logged-in user"""
    try:
        user_id = g.user.id
        cameras = UserCamera.query.filter_by(user_id=user_id).all()
        
        camera_list = []
        for camera in cameras:
            camera_list.append({
                'id': camera.id,
                'camera_id': camera.camera_id,
                'camera_name': camera.camera_name,
                'camera_type': camera.camera_type,
                'description': camera.description,
                'location': camera.location,
                'stream_url': camera.stream_url,
                'width': camera.width,
                'height': camera.height,
                'fps': camera.fps,
                'created_at': camera.created_at.isoformat() if camera.created_at else None,
                'last_accessed': camera.last_accessed.isoformat() if camera.last_accessed else None
            })
        
        return jsonify(camera_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_cameras_bp.route('/', methods=['POST'])
@login_required
def add_user_camera():
    """Add a new camera for the logged-in user"""
    try:
        user_id = g.user.id
        data = request.json
        
        # Validate required fields
        required_fields = ['camera_id', 'camera_name', 'camera_type', 'stream_url']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new camera
        new_camera = UserCamera(
            user_id=user_id,
            camera_id=data['camera_id'],
            camera_name=data['camera_name'],
            camera_type=data['camera_type'],
            stream_url=data['stream_url'],
            description=data.get('description'),
            location=data.get('location'),
            width=data.get('width'),
            height=data.get('height'),
            fps=data.get('fps')
        )
        
        # Add to database
        db.session.add(new_camera)
        db.session.commit()
        
        return jsonify({
            'id': new_camera.id,
            'camera_id': new_camera.camera_id,
            'camera_name': new_camera.camera_name,
            'message': 'Camera added successfully'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_cameras_bp.route('/<int:camera_id>', methods=['PUT'])
@login_required
def update_user_camera(camera_id):
    """Update an existing camera for the logged-in user"""
    try:
        user_id = g.user.id
        data = request.json
        
        # Find the camera
        camera = UserCamera.query.filter_by(id=camera_id, user_id=user_id).first()
        if not camera:
            return jsonify({'error': 'Camera not found'}), 404
        
        # Update fields
        if 'camera_name' in data:
            camera.camera_name = data['camera_name']
        if 'description' in data:
            camera.description = data['description']
        if 'location' in data:
            camera.location = data['location']
        if 'is_active' in data:
            camera.is_active = data['is_active']
        if 'is_favorite' in data:
            camera.is_favorite = data['is_favorite']
        
        db.session.commit()
        
        return jsonify({
            'id': camera.id,
            'message': 'Camera updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_cameras_bp.route('/<int:camera_id>', methods=['DELETE'])
@login_required
def delete_user_camera(camera_id):
    """Delete a camera for the logged-in user"""
    try:
        user_id = g.user.id
        
        # Find the camera
        camera = UserCamera.query.filter_by(id=camera_id, user_id=user_id).first()
        if not camera:
            return jsonify({'error': 'Camera not found'}), 404
        
        # Delete from database
        db.session.delete(camera)
        db.session.commit()
        
        return jsonify({
            'message': 'Camera deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_cameras_bp.route('/toggle-favorite/<int:camera_id>', methods=['POST'])
@login_required
def toggle_favorite(camera_id):
    """Toggle favorite status of a camera"""
    try:
        user_id = g.user.id
        
        # Find the camera
        camera = UserCamera.query.filter_by(id=camera_id, user_id=user_id).first()
        if not camera:
            return jsonify({'error': 'Camera not found'}), 404
        
        # Toggle favorite status
        camera.toggle_favorite()
        
        return jsonify({
            'id': camera.id,
            'is_favorite': camera.is_favorite,
            'message': f'Camera {"added to" if camera.is_favorite else "removed from"} favorites'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_cameras_bp.route('/toggle-active/<int:camera_id>', methods=['POST'])
@login_required
def toggle_active(camera_id):
    """Toggle active status of a camera"""
    try:
        user_id = g.user.id
        
        # Find the camera
        camera = UserCamera.query.filter_by(id=camera_id, user_id=user_id).first()
        if not camera:
            return jsonify({'error': 'Camera not found'}), 404
        
        # Toggle active status
        camera.toggle_active()
        
        return jsonify({
            'id': camera.id,
            'is_active': camera.is_active,
            'message': f'Camera {"activated" if camera.is_active else "deactivated"}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 