// Add Camera Page JavaScript
//引入video-flv.js



let selectedCamera = null;
let flvPlayer = null;
let cameraType = 'rawdata'; // 默认类型为原始数据

document.addEventListener('DOMContentLoaded', function() {
    // 加载服务器上的摄像头列表
    fetchCameraList();
    
    // 初始化标签页切换
    initializeTabs();
    
    // 初始化数据类型切换
    initializeDataTypeSelector();
    
    // 下一步按钮
    document.getElementById('next-step-btn').addEventListener('click', function() {
        if (selectedCamera) {
            // 切换到第二个标签页
            switchToTab('camera-info-content');
            
            // 默认填充摄像头名称
            document.getElementById('camera-name').value = `监控-${selectedCamera.id}`;
            
            // 设置数据类型
            document.getElementById('camera-type').value = cameraType;
            
            // 尝试填充其他信息
            if (selectedCamera.width && selectedCamera.height) {
                const description = document.getElementById('camera-description');
                description.value = `分辨率: ${selectedCamera.width}x${selectedCamera.height}`;
                
                if (selectedCamera.fps) {
                    description.value += `\n帧率: ${selectedCamera.fps}`;
                }
            }
        }
    });
    
    // 上一步按钮
    document.getElementById('prev-step-btn').addEventListener('click', function() {
        switchToTab('select-camera-content');
    });
    
    // 保存摄像头按钮
    document.getElementById('save-camera-btn').addEventListener('click', function() {
        saveCameraSettings();
    });
});

// 获取服务器上的摄像头列表
function fetchCameraList() {
    const cameraListContainer = document.getElementById('camera-options-container');
    
    // 显示加载状态
    cameraListContainer.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载可用的监控列表...</p>
        </div>
    `;
    
    // 发起API请求获取摄像头列表
    fetch('/api/cameras/')
        .then(response => response.json())
        .then(cameras => {
            renderCameraList(cameras);
        })
        .catch(() => {
            cameraListContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>获取监控列表失败，请稍后重试</p>
                    <button class="btn btn-primary retry-btn" onclick="fetchCameraList()">
                        <i class="fas fa-sync-alt"></i> 重试
                    </button>
                </div>
            `;
        });
}

// 渲染摄像头列表
function renderCameraList(cameras) {
    const cameraListContainer = document.getElementById('camera-options-container');
    
    // 如果没有摄像头，显示空状态
    if (!cameras || cameras.length === 0) {
        cameraListContainer.innerHTML = `
            <div class="no-cameras">
                <i class="fas fa-video-slash"></i>
                <h3>没有找到可用的监控</h3>
                <p>服务器上没有可用的监控摄像头</p>
            </div>
        `;
        return;
    }
    
    // 创建摄像头列表
    const cameraListHTML = `
        <div class="camera-list">
            ${cameras.map(camera => createCameraOption(camera)).join('')}
        </div>
    `;
    
    cameraListContainer.innerHTML = cameraListHTML;
    
    // 添加事件监听器
    document.querySelectorAll('.camera-option').forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选中项
            document.querySelectorAll('.camera-option').forEach(item => {
                item.classList.remove('selected');
            });
            
            // 设置当前项为选中
            this.classList.add('selected');
            
            // 获取摄像头数据
            const cameraId = this.getAttribute('data-id');
            const camera = cameras.find(c => c.id === cameraId);
            
            if (camera) {
                selectedCamera = camera;
                
                // 预览摄像头视频
                previewCamera(camera);
                
                // 启用下一步按钮
                document.getElementById('next-step-btn').disabled = false;
            }
        });
    });
    
    // 添加预览按钮事件监听器
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡，避免触发整个选项的点击事件
            
            const cameraId = this.getAttribute('data-id');
            const camera = cameras.find(c => c.id === cameraId);
            
            if (camera) {
                // 自动选中当前摄像头
                document.querySelectorAll('.camera-option').forEach(item => {
                    item.classList.remove('selected');
                });
                
                const parentOption = this.closest('.camera-option');
                if (parentOption) {
                    parentOption.classList.add('selected');
                }
                
                selectedCamera = camera;
                
                // 预览摄像头视频
                previewCamera(camera);
                
                // 启用下一步按钮
                document.getElementById('next-step-btn').disabled = false;
            }
        });
    });
    
    // 添加切换数据类型按钮事件监听器
    document.querySelectorAll('.toggle-type-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // 阻止事件冒泡，避免触发整个选项的点击事件
            
            const cameraId = this.getAttribute('data-id');
            const camera = cameras.find(c => c.id === cameraId);
            
            if (camera && camera.has_processed) {
                // 切换类型
                if (cameraType === 'rawdata') {
                    cameraType = 'processed';
                    this.innerHTML = `<i class="fas fa-exchange-alt"></i> 原始数据`;
                } else {
                    cameraType = 'rawdata';
                    this.innerHTML = `<i class="fas fa-exchange-alt"></i> 处理数据`;
                }
                
                // 如果当前摄像头是选中的，更新预览
                if (selectedCamera && selectedCamera.id === camera.id) {
                    previewCamera(camera);
                }
            }
        });
    });
}

// 创建摄像头选项
function createCameraOption(camera) {
    return `
        <div class="camera-option" data-id="${camera.id}">
            <div class="camera-option-header">
                <div>
                    <div class="camera-option-name">监控-${camera.id}</div>
                    <div class="camera-option-id">ID: ${camera.id}</div>
                </div>
                <div>
                    ${camera.has_processed ? 
                        `<span class="badge badge-success">支持AI分析</span>` : 
                        `<span class="badge badge-secondary">基础监控</span>`}
                </div>
            </div>
            
            <div class="camera-option-details">
                ${camera.width && camera.height ? 
                    `<div>分辨率: ${camera.width}x${camera.height}</div>` : ''}
                ${camera.fps ? 
                    `<div>帧率: ${camera.fps}</div>` : ''}
            </div>
            
            <div class="camera-option-actions">
                ${camera.has_processed ? 
                    `<button class="btn btn-sm btn-secondary toggle-type-btn" data-id="${camera.id}">
                        <i class="fas fa-exchange-alt"></i> 处理数据
                    </button>` : ''}
                <button class="btn btn-sm btn-primary preview-btn" data-id="${camera.id}">
                    <i class="fas fa-eye"></i> 预览
                </button>
            </div>
        </div>
    `;
}

// 预览摄像头视频
function previewCamera(camera) {
    // 销毁之前的播放器
    if (flvPlayer) {
        flvPlayer.destroy();
        flvPlayer = null;
    }
    
    const videoContainer = document.getElementById('preview-player');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    
    // 清空视频容器
    videoContainer.innerHTML = '';
    
    // 选择正确的URL
    const streamUrl = cameraType === 'processed' && camera.has_processed ? 
        camera.processed_url : camera.rawdata_url;
    
    // 创建视频元素
    const videoElement = document.createElement('video');
    videoElement.id = 'preview-video-' + Math.random().toString(36).substr(2, 9);
    videoElement.className = 'video-player';
    videoElement.controls = true;
    videoElement.muted = true;
    videoElement.autoplay = true;
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'contain';
    
    videoContainer.appendChild(videoElement);
    
    // 隐藏占位符，显示视频容器
    previewPlaceholder.style.display = 'none';
    videoContainer.style.display = 'block';
    
    // 检查FLV.js是否可用
    if (typeof flvjs === 'undefined' || !flvjs.isSupported()) {
        return;
    }

    // 使用优化后的playFlvVideo函数
    flvPlayer = playFlvVideo(streamUrl, videoElement, {
        onError: () => {
            videoContainer.style.display = 'none';
            previewPlaceholder.style.display = 'flex';
        }
    });
}

// 初始化标签页切换
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.form-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.id.replace('-tab', '-content');
            
            // 如果是切换到第二个标签页，但没有选择摄像头，则不允许切换
            if (tabId === 'camera-info-content' && !selectedCamera) {
                showNotification('请先选择一个摄像头', 'warning');
                return;
            }
            
            switchToTab(tabId);
        });
    });
}

// 切换到指定标签页
function switchToTab(tabId) {
    // 更新标签按钮状态
    const tabButtons = document.querySelectorAll('.form-tab');
    tabButtons.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 根据 tabId 找到对应的标签按钮
    const tabButtonId = tabId.replace('-content', '-tab');
    const activeTab = document.getElementById(tabButtonId);
    activeTab.classList.add('active');
    
    // 更新标签内容显示
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(tabId);
    activeContent.style.display = 'block';
}

// 保存摄像头设置
function saveCameraSettings() {
    if (!selectedCamera) {
        showNotification('请先选择一个摄像头', 'error');
        return;
    }
    
    // 获取表单数据
    const cameraName = document.getElementById('camera-name').value;
    const cameraLocation = document.getElementById('camera-location').value;
    const cameraDescription = document.getElementById('camera-description').value;
    const cameraType = document.getElementById('camera-type').value;
    
    // 验证表单
    if (!cameraName.trim()) {
        console.log("请输入监控名称")
        showNotification('请输入监控名称', 'warning');
        document.getElementById('camera-name').focus();
        return;
    }
    
    // 准备请求数据
    const requestData = {
        camera_id: selectedCamera.id,
        camera_name: cameraName,
        camera_type: cameraType,
        stream_url: cameraType === 'processed' && selectedCamera.has_processed ? 
            selectedCamera.processed_url : selectedCamera.rawdata_url,
        description: cameraDescription,
        location: cameraLocation,
        width: selectedCamera.width,
        height: selectedCamera.height,
    };
    
    // 显示加载状态
    const saveBtn = document.getElementById('save-camera-btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    // 发送保存请求
    fetch('/api/user-cameras/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("添加成功")
        showNotification(`监控 "${data.camera_name}" 已添加成功`, 'success');
        setTimeout(() => {
            window.location.href = '/camera-management';
        }, 1500);
    })
    .catch(() => {
        showNotification('保存失败，请稍后重试', 'error');
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    });
}

// 显示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
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

// 初始化数据类型切换
function initializeDataTypeSelector() {
    const rawdataOption = document.getElementById('rawdata-option');
    const processedOption = document.getElementById('processed-option');
    
    if (rawdataOption && processedOption) {
        rawdataOption.addEventListener('click', function() {
            if (cameraType !== 'rawdata') {
                cameraType = 'rawdata';
                rawdataOption.classList.add('selected');
                processedOption.classList.remove('selected');
                
                if (selectedCamera) {
                    previewCamera(selectedCamera);
                }
            }
        });
        
        processedOption.addEventListener('click', function() {
            if (cameraType !== 'processed' && selectedCamera && selectedCamera.has_processed) {
                cameraType = 'processed';
                processedOption.classList.add('selected');
                rawdataOption.classList.remove('selected');
                previewCamera(selectedCamera);
            } else if (!selectedCamera) {
                showNotification('请先选择一个摄像头', 'warning');
            } else if (!selectedCamera.has_processed) {
                showNotification('该摄像头不支持AI分析功能', 'warning');
            }
        });
    }
} 