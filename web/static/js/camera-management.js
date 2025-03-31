// Camera Management Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // 获取摄像头列表
    fetchUserCameras();
    
    // 初始化过滤器
    initializeFilters();
});

// 获取用户的摄像头列表
function fetchUserCameras() {
    const cameraListContainer = document.getElementById('camera-container');
    
    // 显示加载状态
    cameraListContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载您的监控列表...</p>
        </div>
    `;
    
    // 发起API请求获取用户摄像头列表
    fetch('/api/user-cameras/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(cameras => {
            renderCameraList(cameras);
        })
        .catch(error => {
            console.error('获取摄像头列表失败:', error);
            cameraListContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>获取监控列表失败，请稍后重试</p>
                    <button class="btn btn-primary retry-btn" onclick="fetchUserCameras()">
                        <i class="fas fa-sync-alt"></i> 重试
                    </button>
                </div>
            `;
        });
}

// 渲染摄像头列表
function renderCameraList(cameras) {
    const cameraListContainer = document.getElementById('camera-container');
    
    // 如果没有摄像头，显示空状态
    if (cameras.length === 0) {
        cameraListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>没有找到监控</h3>
                <p>您还没有添加任何监控摄像头</p>
                <a href="/add-camera" class="btn btn-primary">
                    <i class="fas fa-plus"></i> 添加监控
                </a>
            </div>
        `;
        return;
    }
    
    // 创建摄像头网格
    const cameraGridHTML = `
        <div class="camera-grid">
            ${cameras.map(camera => createCameraCard(camera)).join('')}
        </div>
    `;
    
    cameraListContainer.innerHTML = cameraGridHTML;
    
    // 添加事件监听器
    addCameraCardEventListeners();
}

// 创建摄像头卡片
function createCameraCard(camera) {
    const isActive = camera.is_active;
    const typeClass = camera.camera_type === 'processed' ? 'processed' : 'rawdata';
    const typeText = camera.camera_type === 'processed' ? '处理数据' : '原始数据';
    
    return `
        <div class="camera-item" 
             data-id="${camera.id}"
             data-camera-id="${camera.camera_id}"
             data-name="${camera.camera_name}"
             data-location="${camera.location || ''}"
             data-active="${isActive}"
             data-favorite="${camera.is_favorite}"
             data-type="${camera.camera_type}">
            <div class="camera-thumbnail">
                <img src="../static/images/camera-thumbnail.jpg" alt="${camera.camera_name}">
                ${!isActive ? `
                    <div class="camera-offline">
                        <i class="fas fa-video-slash"></i>
                        <p>监控离线</p>
                    </div>
                ` : ''}
            </div>
            <div class="camera-info">
                <div class="camera-name">
                    <div class="camera-name-text">${camera.camera_name}</div>
                    ${camera.is_favorite ? `<i class="fas fa-star" style="color: gold;"></i>` : ''}
                </div>
                <div class="camera-type ${typeClass}">${typeText}</div>
                ${camera.location ? `<div class="camera-location"><i class="fas fa-map-marker-alt"></i> ${camera.location}</div>` : ''}
                <div class="camera-status">
                    <span class="status-indicator ${isActive ? 'status-active' : 'status-inactive'}"></span>
                    ${isActive ? '在线' : '离线'}
                </div>
                <div class="camera-actions">
                    <button class="btn btn-sm btn-view view-camera-btn" data-id="${camera.id}" title="查看监控">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-edit edit-camera-btn" data-id="${camera.id}" title="编辑监控">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-delete delete-camera-btn" data-id="${camera.id}" title="删除监控">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 添加摄像头卡片事件监听器
function addCameraCardEventListeners() {
    // 查看监控按钮点击事件
    document.querySelectorAll('.view-camera-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const cameraId = this.getAttribute('data-id');
            const cameraItem = document.querySelector(`.camera-item[data-id="${cameraId}"]`);
            const cameraName = cameraItem.getAttribute('data-name');
            const cameraType = cameraItem.getAttribute('data-type');
            const streamUrl = `/api/cameras/${cameraItem.getAttribute('data-camera-id')}?type=${cameraType}`;
            
            showNotification(`正在查看 ${cameraName} 监控...`, 'info');
            
            // 这里可以跳转到监控详情页，或者打开一个模态框显示监控画面
            window.location.href = `/monitor-detail?id=${cameraId}&name=${encodeURIComponent(cameraName)}`;
        });
    });
    
    // 编辑监控按钮点击事件
    document.querySelectorAll('.edit-camera-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const cameraId = this.getAttribute('data-id');
            const cameraItem = document.querySelector(`.camera-item[data-id="${cameraId}"]`);
            const cameraName = cameraItem.getAttribute('data-name');
            
            showNotification(`准备编辑 ${cameraName} 监控信息...`, 'info');
            
            // 跳转到编辑页面
            window.location.href = `/edit-camera/${cameraId}`;
        });
    });
    
    // 删除监控按钮点击事件
    document.querySelectorAll('.delete-camera-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const cameraId = this.getAttribute('data-id');
            const cameraItem = document.querySelector(`.camera-item[data-id="${cameraId}"]`);
            const cameraName = cameraItem.getAttribute('data-name');
            
            if (confirm(`确定要删除监控 "${cameraName}" 吗？此操作无法撤销。`)) {
                deleteCameraById(cameraId, cameraName);
            }
        });
    });
    
    // 摄像头卡片点击事件（切换收藏状态）
    document.querySelectorAll('.camera-item').forEach(item => {
        item.addEventListener('dblclick', function() {
            const cameraId = this.getAttribute('data-id');
            const cameraName = this.getAttribute('data-name');
            const isFavorite = this.getAttribute('data-favorite') === 'true';
            
            toggleCameraFavorite(cameraId, cameraName, isFavorite);
        });
    });
}

// 切换摄像头收藏状态
function toggleCameraFavorite(cameraId, cameraName, currentState) {
    fetch(`/api/user-cameras/toggle-favorite/${cameraId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const cameraItem = document.querySelector(`.camera-item[data-id="${cameraId}"]`);
        if (cameraItem) {
            cameraItem.setAttribute('data-favorite', data.is_favorite);
            
            const starIcon = cameraItem.querySelector('.camera-name i');
            if (data.is_favorite) {
                if (!starIcon) {
                    const nameText = cameraItem.querySelector('.camera-name-text');
                    const star = document.createElement('i');
                    star.className = 'fas fa-star';
                    star.style.color = 'gold';
                    nameText.parentNode.appendChild(star);
                }
            } else {
                if (starIcon) {
                    starIcon.remove();
                }
            }
            
            showNotification(data.message, 'success');
        }
    })
    .catch(error => {
        console.error('切换收藏状态失败:', error);
        showNotification('操作失败，请稍后重试', 'error');
    });
}

// 删除摄像头
function deleteCameraById(cameraId, cameraName) {
    fetch(`/api/user-cameras/${cameraId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // 删除成功，从DOM中移除摄像头卡片
        const cameraItem = document.querySelector(`.camera-item[data-id="${cameraId}"]`);
        if (cameraItem) {
            cameraItem.remove();
        }
        
        // 检查是否还有摄像头卡片，如果没有显示空状态
        const remainingCameras = document.querySelectorAll('.camera-item');
        if (remainingCameras.length === 0) {
            renderCameraList([]);
        }
        
        showNotification(`已删除监控 "${cameraName}"`, 'success');
    })
    .catch(error => {
        console.error('删除监控失败:', error);
        showNotification('删除失败，请稍后重试', 'error');
    });
}

// 初始化过滤器
function initializeFilters() {
    // 状态过滤
    document.querySelectorAll('[data-filter]').forEach(option => {
        option.addEventListener('click', function() {
            // 更新选中状态
            document.querySelectorAll('[data-filter]').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
            
            // 执行过滤
            applyFilters();
        });
    });
    
    // 类型过滤
    document.querySelectorAll('[data-type]').forEach(option => {
        option.addEventListener('click', function() {
            // 更新选中状态
            document.querySelectorAll('[data-type]').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
            
            // 执行过滤
            applyFilters();
        });
    });
    
    // 收藏过滤
    document.querySelectorAll('[data-favorite]').forEach(option => {
        option.addEventListener('click', function() {
            // 更新选中状态
            document.querySelectorAll('[data-favorite]').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
            
            // 执行过滤
            applyFilters();
        });
    });
    
    // 搜索过滤
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
        });
    }
}

// 应用过滤器
function applyFilters() {
    const statusFilter = document.querySelector('[data-filter].active').getAttribute('data-filter');
    const typeFilter = document.querySelector('[data-type].active').getAttribute('data-type');
    const favoriteFilter = document.querySelector('[data-favorite].active').getAttribute('data-favorite');
    const searchText = document.querySelector('.search-input').value.toLowerCase();
    
    document.querySelectorAll('.camera-item').forEach(item => {
        const isActive = item.getAttribute('data-active') === 'true';
        const type = item.getAttribute('data-type');
        const isFavorite = item.getAttribute('data-favorite') === 'true';
        const name = item.getAttribute('data-name').toLowerCase();
        const location = item.getAttribute('data-location').toLowerCase();
        
        let visible = true;
        
        // 应用状态过滤
        if (statusFilter === 'active' && !isActive) {
            visible = false;
        } else if (statusFilter === 'inactive' && isActive) {
            visible = false;
        }
        
        // 应用类型过滤
        if (visible && typeFilter !== 'all' && type !== typeFilter) {
            visible = false;
        }
        
        // 应用收藏过滤
        if (visible && favoriteFilter === 'true' && !isFavorite) {
            visible = false;
        }
        
        // 应用搜索过滤
        if (visible && searchText) {
            if (!name.includes(searchText) && !location.includes(searchText)) {
                visible = false;
            }
        }
        
        // 设置可见性
        item.style.display = visible ? 'block' : 'none';
    });
    
    // 检查是否有可见的摄像头
    const visibleCameras = document.querySelectorAll('.camera-item[style="display: block"]');
    if (visibleCameras.length === 0) {
        const cameraGrid = document.querySelector('.camera-grid');
        if (cameraGrid) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <p>没有找到符合条件的监控</p>
            `;
            
            // 如果已经存在"无结果"提示，则不再添加
            const existingNoResults = cameraGrid.querySelector('.no-results');
            if (!existingNoResults) {
                cameraGrid.appendChild(noResults);
            }
        }
    } else {
        // 移除"无结果"提示
        const noResults = document.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
} 