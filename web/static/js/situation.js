// City Situation Awareness Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize with empty array, will be populated from API
    let alertsData = [];
    
    // Fetch alerts from API
    fetchAlerts();
    
    // Fetch user cameras from API
    fetchUserCameras();
    
    // Periodically check for new alerts
    setInterval(() => {
        generateNewAlert();
    }, 30000); // Every 30 seconds

    // Add hotspot click events
    setupHotspotEvents();
    
    // Setup view switching
    setupViewSwitching();
    
    // Setup main video and video list interactions

});

// Fetch alerts from the backend API
function fetchAlerts() {
    fetch('/api/alerts/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update our alerts data
            alertsData = data;
            // Render the alerts
            renderAlerts(alertsData);
        })
        .catch(error => {
            console.error('Error fetching alerts:', error);
            showNotification('获取预警信息失败', 'error');
        });
}

// Fetch user cameras from the backend API
function fetchUserCameras() {
    fetch('/api/user-cameras/')
        .then(response => response.json())
        .then(cameras => {
            renderCameraList(cameras);
        })
        .catch(error => {
            console.error('Error fetching user cameras:', error);
            showNotification('获取监控列表失败', 'error');
        });
}

// Generate a new alert using the API
function generateNewAlert() {
    fetch('/api/alerts/generate')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(newAlert => {
            // Fetch all alerts again to ensure we have the latest data
            fetchAlerts();
            showNotification(`新预警: ${newAlert.title}`, 'warning');
        })
        .catch(error => {
            console.error('Error generating new alert:', error);
        });
}

// Render alerts in the alerts container
function renderAlerts(alerts) {
    const alertsContainer = document.querySelector('.alerts-container');
    if (!alertsContainer) return;

    alertsContainer.innerHTML = '';
    
    alerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert-item';
        alertElement.innerHTML = `
            <div class="alert-header">
                <div class="alert-title">
                    <span class="status status-${alert.severity}"></span>
                    ${alert.title}
                </div>
                <div class="alert-time">${formatTime(alert.time)}</div>
            </div>
            <div class="alert-content">${alert.content}</div>
            <div class="alert-footer">
                <div class="alert-location">
                    <i class="fas fa-map-marker-alt"></i> ${alert.location}
                </div>
                <div class="alert-severity ${alert.severity}">
                    ${getSeverityText(alert.severity)}
                </div>
            </div>
        `;
        
        alertsContainer.appendChild(alertElement);
    });
}

// Get severity text based on severity level
function getSeverityText(severity) {
    switch(severity) {
        case 'high':
            return '高风险';
        case 'medium':
            return '中风险';
        case 'low':
            return '低风险';
        default:
            return '未知';
    }
}

// Setup hotspot click events
function setupHotspotEvents() {
    const hotspots = document.querySelectorAll('.hotspot');
    
    hotspots.forEach(hotspot => {
        hotspot.addEventListener('click', function() {
            const location = this.getAttribute('data-location');
            const density = this.getAttribute('data-density');
            const count = this.getAttribute('data-count');
            const status = this.getAttribute('data-status');
            
            showNotification(`正在查看 ${location} 的详细信息`, 'info');
            
            // Highlight the selected hotspot
            hotspots.forEach(h => h.classList.remove('selected'));
            this.classList.add('selected');
            
            // Simulate loading data
            setTimeout(() => {
                // Here you would typically load detailed data for the location
                showNotification(`${location} 数据加载完成`, 'success');
                
                // Update the main video to show the selected location
                const cameraFeeds = document.querySelectorAll('.camera-feed');
                cameraFeeds.forEach(feed => {
                    const feedLocation = feed.querySelector('.camera-location');
                    if (feedLocation && feedLocation.textContent.includes(location)) {
                        feed.click();
                    }
                });
            }, 1000);
        });
    });
    
    // Setup heatmap controls
    setupHeatmapControls();
}

// Setup heatmap controls
function setupHeatmapControls() {
    const heatmap = document.querySelector('.heatmap');
    const mapBackground = document.querySelector('.map-background');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetViewBtn = document.getElementById('reset-view');
    const refreshHeatmapBtn = document.getElementById('refresh-heatmap');
    const fullscreenHeatmapBtn = document.getElementById('fullscreen-heatmap');
    
    if (!heatmap || !mapBackground) return;
    
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX, startY;
    
    // Zoom in button
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            if (scale < 2) {
                scale += 0.2;
                updateMapTransform();
            }
        });
    }
    
    // Zoom out button
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            if (scale > 0.6) {
                scale -= 0.2;
                updateMapTransform();
            }
        });
    }
    
    // Reset view button
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateMapTransform();
        });
    }
    
    // Refresh heatmap button
    if (refreshHeatmapBtn) {
        refreshHeatmapBtn.addEventListener('click', function() {
            const button = this;
            button.querySelector('i').classList.add('fa-spin');
            
            // Simulate refreshing data
            setTimeout(() => {
                button.querySelector('i').classList.remove('fa-spin');
                updateHeatmapData();
                showNotification('热力图数据已更新', 'success');
            }, 1500);
        });
    }
    
    // Fullscreen button
    if (fullscreenHeatmapBtn) {
        fullscreenHeatmapBtn.addEventListener('click', function() {
            toggleFullscreen(heatmap);
        });
    }
    
    // Mouse wheel zoom
    heatmap.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        if (e.deltaY < 0) {
            // Zoom in
            if (scale < 2) scale += 0.1;
        } else {
            // Zoom out
            if (scale > 0.6) scale -= 0.1;
        }
        
        updateMapTransform();
    });
    
    // Pan functionality
    heatmap.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        heatmap.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        
        // Limit panning
        const maxTranslate = 200 * scale;
        translateX = Math.max(-maxTranslate, Math.min(translateX, maxTranslate));
        translateY = Math.max(-maxTranslate, Math.min(translateY, maxTranslate));
        
        updateMapTransform();
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        heatmap.style.cursor = 'grab';
    });
    
    // Double click to zoom in
    heatmap.addEventListener('dblclick', function(e) {
        if (scale < 2) {
            scale += 0.3;
            updateMapTransform();
        }
    });
    
    // Update map transform
    function updateMapTransform() {
        mapBackground.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    }
    
    // Initialize cursor
    heatmap.style.cursor = 'grab';
    
    // Setup time-based data visualization
    setupTimeBasedVisualization();
}

// Update heatmap data (simulated)
function updateHeatmapData() {
    const hotspots = document.querySelectorAll('.hotspot');
    
    hotspots.forEach(hotspot => {
        // Generate random data
        const density = ['低', '中', '高'][Math.floor(Math.random() * 3)];
        const count = Math.floor(Math.random() * 200) + 50;
        const isVehicle = hotspot.getAttribute('data-location').includes('停车场');
        const countText = isVehicle ? `${count}辆` : `${count}人`;
        
        // Update data attributes
        hotspot.setAttribute('data-density', density);
        hotspot.setAttribute('data-count', countText);
        
        // Update info display
        const infoElement = hotspot.querySelector('.hotspot-info');
        if (infoElement) {
            const densityType = isVehicle ? '车辆密度' : '人流密度';
            const countType = isVehicle ? '当前车辆' : '当前人数';
            
            infoElement.innerHTML = `
                <h4>${hotspot.getAttribute('data-location')}</h4>
                <p>${densityType}: ${density}</p>
                <p>${countType}: ${countText}</p>
                <p>状态: ${getStatusFromDensity(density, isVehicle)}</p>
            `;
        }
        
        // Update visual appearance based on density
        hotspot.style.animation = density === '高' ? 'pulse 1s infinite' : 'pulse 3s infinite';
        
        if (density === '高') {
            hotspot.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            hotspot.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.8)';
        } else if (density === '中') {
            hotspot.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
            hotspot.style.boxShadow = '0 0 12px rgba(255, 165, 0, 0.7)';
        } else {
            hotspot.style.backgroundColor = 'rgba(255, 255, 0, 0.6)';
            hotspot.style.boxShadow = '0 0 10px rgba(255, 255, 0, 0.6)';
        }
    });
    
    // Update heatmap overlay
    updateHeatmapOverlay();
}

// Get status text based on density
function getStatusFromDensity(density, isVehicle) {
    if (isVehicle) {
        switch(density) {
            case '高': return '车辆密集';
            case '中': return '车流正常';
            case '低': return '车辆稀少';
            default: return '正常';
        }
    } else {
        switch(density) {
            case '高': return '人流密集';
            case '中': return '人流正常';
            case '低': return '人流稀少';
            default: return '正常';
        }
    }
}

// Update heatmap overlay based on hotspot data
function updateHeatmapOverlay() {
    const heatmapOverlay = document.querySelector('.heatmap-overlay');
    if (!heatmapOverlay) return;
    
    // Create dynamic gradient based on hotspot positions
    const hotspots = document.querySelectorAll('.hotspot');
    let gradients = '';
    
    hotspots.forEach((hotspot, index) => {
        const rect = hotspot.getBoundingClientRect();
        const heatmapRect = document.querySelector('.heatmap').getBoundingClientRect();
        
        const x = ((rect.left + rect.width/2) - heatmapRect.left) / heatmapRect.width * 100;
        const y = ((rect.top + rect.height/2) - heatmapRect.top) / heatmapRect.height * 100;
        
        const density = hotspot.getAttribute('data-density');
        let color, size;
        
        switch(density) {
            case '高':
                color = 'rgba(255, 0, 0, 0.4)';
                size = '70%';
                break;
            case '中':
                color = 'rgba(255, 165, 0, 0.3)';
                size = '50%';
                break;
            default:
                color = 'rgba(255, 255, 0, 0.2)';
                size = '30%';
        }
        
        gradients += `radial-gradient(circle at ${x}% ${y}%, ${color} 0%, rgba(255, 165, 0, 0.2) ${size}, transparent 100%)${index < hotspots.length - 1 ? ',' : ''}`;
    });
    
    heatmapOverlay.style.background = gradients;
}

// Setup time-based visualization
function setupTimeBasedVisualization() {
    const timeButtons = document.querySelectorAll('.date-range button');
    if (!timeButtons.length) return;
    
    timeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            timeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update heatmap based on selected time range
            const timeRange = this.textContent.trim();
            showNotification(`正在加载${timeRange}数据...`, 'info');
            
            setTimeout(() => {
                updateHeatmapData();
                showNotification(`已更新为${timeRange}热力图数据`, 'success');
            }, 1000);
        });
    });
}

// Format time for display
function formatTime(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) {
        return `${diff}秒前`;
    } else if (diff < 3600) {
        return `${Math.floor(diff / 60)}分钟前`;
    } else if (diff < 86400) {
        return `${Math.floor(diff / 3600)}小时前`;
    } else {
        return date.toLocaleString();
    }
}

// 全屏切换功能
function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
        element.requestFullscreen().catch(err => {
            console.error(`全屏错误: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// 显示通知函数
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 自动关闭
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Setup view switching between grid and list views
function setupViewSwitching() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const monitoringContainer = document.querySelector('.monitoring-container');
    
    if (!gridViewBtn || !listViewBtn || !monitoringContainer) return;
    
    // Set initial view based on active button
    if (gridViewBtn.classList.contains('active')) {
        monitoringContainer.classList.add('grid-view');
    } else {
        monitoringContainer.classList.remove('grid-view');
    }
    
    // Grid view button click handler
    gridViewBtn.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            this.classList.add('active');
            listViewBtn.classList.remove('active');
            monitoringContainer.classList.add('grid-view');
            showNotification('已切换到网格视图', 'info');
            
            // Save preference to localStorage
            localStorage.setItem('monitoringViewPreference', 'grid');
        }
    });
    
    // List view button click handler
    listViewBtn.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            this.classList.add('active');
            gridViewBtn.classList.remove('active');
            monitoringContainer.classList.remove('grid-view');
            showNotification('已切换到列表视图', 'info');
            
            // Save preference to localStorage
            localStorage.setItem('monitoringViewPreference', 'list');
        }
    });
    
    // Load user preference from localStorage if available
    const savedViewPreference = localStorage.getItem('monitoringViewPreference');
    if (savedViewPreference === 'grid') {
        gridViewBtn.click();
    } else if (savedViewPreference === 'list') {
        listViewBtn.click();
    }
    
    // Add hover effect to camera feeds to show "点击查看详情" message
    const cameraFeeds = document.querySelectorAll('.camera-feed');
    cameraFeeds.forEach(feed => {
        const cameraLink = feed.querySelector('.camera-link');
        if (cameraLink) {
            cameraLink.addEventListener('mouseenter', function() {
                console.log('Hovering camera feed');
            });
            
            cameraLink.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                const locationName = feed.querySelector('.camera-location')?.textContent.trim() || '监控点';
                console.log(`跳转到监控详情页: ${locationName}`);
                
                // We don't prevent default here to allow the link to work
                showNotification(`正在加载 ${locationName} 的详细监控信息...`, 'info');
            });
        }
    });
}

// Setup  video list interactions
function setupVideoMainInteractions() {
    const mainVideo = document.querySelector('.mainVideo');
    const mainVideoTitle = document.getElementById('main-video-title');
    const mainVideoDescription = document.getElementById('main-video-description');
    const mainVideoPeople = document.getElementById('main-video-people');
    const mainVideoAlerts = document.getElementById('main-video-alerts');
    const mainVideoTime = document.getElementById('main-video-time');
    const mainVideoDetailBtn = document.getElementById('main-video-detail-btn');
    const mainVideoFullscreenBtn = document.getElementById('main-video-fullscreen-btn');
    const cameraFeeds = document.querySelectorAll('.camera-feed');
    const cameraDetailBtns = document.querySelectorAll('.camera-detail-btn');
    
    if (!mainVideo || !mainVideoTitle || !mainVideoDescription || !cameraFeeds.length) {
        console.warn('主视频元素或视频列表未找到');
        return;
    }
    
    // 设置主视频详情按钮点击事件
    if (mainVideoDetailBtn) {
        mainVideoDetailBtn.addEventListener('click', function() {
            const activeCamera = document.querySelector('.camera-feed.active');
            if (activeCamera) {
                const cameraId = activeCamera.getAttribute('data-id');
                const cameraTitle = activeCamera.getAttribute('data-title');
                
                // 跳转到详情页
                const detailUrl = `monitor-detail.html?id=${cameraId}&title=${encodeURIComponent(cameraTitle)}`;
                window.location.href = detailUrl;
            }
        });
    }

    

    if (mainVideoFullscreenBtn) {
        mainVideoFullscreenBtn.addEventListener('click', function() {
            toggleFullscreen(mainVideo);
        });
    }
    


}

function setupVideoListInteractions(){

    const cameraFeeds = document.querySelectorAll('.camera-feed');
    const cameraDetailBtns = document.querySelectorAll('.camera-detail-btn');  

    
    // 设置列表项详情按钮点击事件
    cameraDetailBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // 阻止事件冒泡，避免触发列表项的点击事件
            e.stopPropagation();
            
            const cameraId = this.getAttribute('data-id');
            const cameraTitle = this.getAttribute('data-title');
            
            // 跳转到详情页
            const detailUrl = `monitor-detail.html?id=${cameraId}&title=${encodeURIComponent(cameraTitle)}`;
            window.location.href = detailUrl;
            
            showNotification(`正在加载 ${cameraTitle} 的详细监控信息...`, 'info');
        });
    });
    
    //为监控点列表每个卡片添加点击事件
    cameraFeeds.forEach(feed => {
        feed.addEventListener('click', () => {
            //移除所有卡片的激活状态
            console.log(feed)
            cameraFeeds.forEach(item => item.classList.remove('active'));
            
            //添加当前卡片的激活状态
            feed.classList.add('active')

            //获取当前卡片的数据
            videoElement = feed.querySelector(".videoElement")

            updateMainVideo(videoElement)
        })
    })
}

// 修改 updateMainVideo 函数
function updateMainVideo(videoElement) {
    const mainVideo = document.querySelector('.mainVideo');
    const mainVideoTitle = document.getElementById('main-video-title');
    const mainVideoDescription = document.getElementById('main-video-description');
    const mainVideoPeople = document.getElementById('main-video-people');
    const mainVideoAlerts = document.getElementById('main-video-alerts');
    const mainVideoTime = document.getElementById('main-video-time');
    
    if (!mainVideo || !mainVideoTitle || !mainVideoDescription) {
        console.error('主视频元素或视频列表未找到');
        return;
    }
    
    // 获取父元素（camera-feed）
    const cameraFeed = videoElement.closest('.camera-feed');
    if (!cameraFeed) {
        console.error('未找到摄像头父元素');
        return;
    }
    
    // 更新主视频信息
    mainVideoTitle.textContent = cameraFeed.getAttribute('data-title');
    mainVideoDescription.textContent = cameraFeed.getAttribute('data-description');
    mainVideoPeople.textContent = cameraFeed.getAttribute('data-people');
    mainVideoAlerts.textContent = cameraFeed.getAttribute('data-alerts');
    mainVideoTime.textContent = cameraFeed.getAttribute('data-time');
    
    // 获取摄像头视频流并播放
    const srcStream = videoElement.getAttribute('src_stream');
    if (srcStream) {
        // 使用 requestAnimationFrame 确保在下一帧执行
        requestAnimationFrame(() => {
            playFlvVideo(srcStream, mainVideo);
        });
    }
}

// Render camera list
function renderCameraList(cameras) {
    const monitoringContainer = document.querySelector('.monitoring-container');
    if (!monitoringContainer) return;

    monitoringContainer.innerHTML = '';
    
    // 创建主视频区域
    const mainVideoContainer = document.createElement('div');
    mainVideoContainer.className = 'main-video-container';
    mainVideoContainer.innerHTML = `
        <div class="main-video-preview">
            <video class="mainVideo" muted autoplay width="1024" height="576">Your browser is too old which doesn't support HTML5 video.</video>
            <div class="main-video-status">
                <span class="status status-success"></span> 在线
            </div>
        </div>
        <div class="main-video-overlay">
            <div class="main-video-info">
                <div class="main-video-details">
                    <div class="main-video-title">
                        <i class="fas fa-map-marker-alt"></i>
                        <span id="main-video-title">选择摄像头</span>
                    </div>
                    <div class="main-video-description" id="main-video-description">
                        请选择一个摄像头查看详情
                    </div>
                    <div class="main-video-stats">
                        <span class="stat">
                            <i class="fas fa-users"></i>
                            <span id="main-video-people">0人</span>
                        </span>
                        <span class="stat">
                            <i class="fas fa-exclamation-circle"></i>
                            <span id="main-video-alerts">0告警</span>
                        </span>
                        <span class="stat">
                            <i class="fas fa-clock"></i>
                            <span id="main-video-time">更新于 刚刚</span>
                        </span>
                    </div>
                </div>
                <div class="main-video-actions">
                    <button class="main-video-btn" id="main-video-detail-btn">
                        <i class="fas fa-external-link-alt"></i>
                        查看详情
                    </button>
                    <button class="main-video-btn" id="main-video-fullscreen-btn">
                        <i class="fas fa-expand"></i>
                        全屏
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 创建视频列表容器
    const videoListContainer = document.createElement('div');
    videoListContainer.className = 'video-list-container';
    videoListContainer.innerHTML = `
        <div class="video-list-header">
            <div class="video-list-title">监控点列表</div>
        </div>
        <div class="video-list"></div>
    `;
    
    // 添加主视频区域和视频列表容器到监控容器
    monitoringContainer.appendChild(mainVideoContainer);
    monitoringContainer.appendChild(videoListContainer);
    
    // 获取视频列表元素
    const videoList = videoListContainer.querySelector('.video-list');
    
    cameras.forEach(camera => {
        const cameraElement = document.createElement('div');
        cameraElement.className = 'camera-feed';
        cameraElement.setAttribute('data-id', camera.id);
        cameraElement.setAttribute('data-title', camera.camera_name);
        cameraElement.setAttribute('data-description', camera.description || '');
        cameraElement.setAttribute('data-people', '0');
        cameraElement.setAttribute('data-alerts', '0');
        cameraElement.setAttribute('data-time', new Date().toLocaleTimeString());
        
        cameraElement.innerHTML = `
            <div class="camera-preview">
                <video class="videoElement" autoplay muted></video>
                <div class="camera-status ${camera.is_active ? 'status-online' : 'status-offline'}">
                    ${camera.is_active ? '在线' : '离线'}
                </div>
                <div class="camera-favorite ${camera.is_favorite ? 'active' : ''}" data-id="${camera.id}">
                    <i class="fas fa-star"></i>
                </div>
            </div>
            <div class="camera-info">
                <h3 class="camera-name">${camera.camera_name}</h3>
                <div class="camera-location">
                    <i class="fas fa-map-marker-alt"></i> ${camera.location || '未知位置'}
                </div>
                <div class="camera-id">ID: ${camera.id}</div>
                <div class="camera-actions">
                    <button class="action-btn view" title="查看详情">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button class="action-btn edit" title="编辑设置">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                </div>
            </div>
        `;
        
        videoList.appendChild(cameraElement);
        
        // 设置视频播放
        const videoElement = cameraElement.querySelector('.videoElement');
        if (videoElement) {
            // 使用摄像头的 stream_url
            videoElement.setAttribute('src_stream', camera.stream_url);
            playFlvVideo(camera.stream_url, videoElement);
        }
    });

    //设置列表卡片交互
    setupVideoListInteractions();
    

    // 设置第一个摄像头为激活状态并更新主视频
    const firstCamera = videoList.querySelector('.camera-feed');
    if (firstCamera) {
        firstCamera.classList.add('active');
        const firstVideoElement = firstCamera.querySelector('.videoElement');
        if (firstVideoElement) {
            updateMainVideo(firstVideoElement);
        }
    } 
}

// 添加一个变量来保存当前视频流 URL
let currentStreamUrl = null;

// 更新主视频显示
function updateMainVideo(videoElement) {
    const mainVideo = document.querySelector('.mainVideo');
    const mainVideoTitle = document.getElementById('main-video-title');
    const mainVideoDescription = document.getElementById('main-video-description');
    const mainVideoPeople = document.getElementById('main-video-people');
    const mainVideoAlerts = document.getElementById('main-video-alerts');
    const mainVideoTime = document.getElementById('main-video-time');
    
    if (!mainVideo || !mainVideoTitle || !mainVideoDescription) {
        console.error('主视频元素或视频列表未找到');
        return;
    }
    
    // 获取父元素（camera-feed）
    const cameraFeed = videoElement.closest('.camera-feed');
    if (!cameraFeed) {
        console.error('未找到摄像头父元素');
        return;
    }
    
    // 更新主视频信息
    mainVideoTitle.textContent = cameraFeed.getAttribute('data-title');
    mainVideoDescription.textContent = cameraFeed.getAttribute('data-description');
    mainVideoPeople.textContent = cameraFeed.getAttribute('data-people');
    mainVideoAlerts.textContent = cameraFeed.getAttribute('data-alerts');
    mainVideoTime.textContent = cameraFeed.getAttribute('data-time');
    
    // 获取摄像头视频流并播放
    const srcStream = videoElement.getAttribute('src_stream');
    if (srcStream) {
        // 使用 requestAnimationFrame 确保在下一帧执行
        requestAnimationFrame(() => {
            playFlvVideo(srcStream, mainVideo);
        });
    }
    setupVideoMainInteractions()
}   

