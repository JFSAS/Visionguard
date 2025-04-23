// 全局变量
let socket = null;
let currentCameraId = null;
let personRecords = []; // 存储人员记录
let currentTrackingPerson = null; // 当前跟踪的人

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const cameraId = urlParams.get('id');
    currentCameraId = cameraId;
    
    if (!cameraId) {
        console.error('摄像头ID无效');
        return;
    }
    
    // 加载摄像头数据
    loadCameraData(cameraId);
    
    // 初始化WebSocket连接
    initializeWebSocket(cameraId);
    
    // 页面卸载时清理播放器和WebSocket连接
    window.addEventListener('beforeunload', function() {
        const videoElement = document.querySelector('.videoElement');
        if (videoElement) {
            cleanupFlvPlayer(videoElement);
        }
        
        // 关闭WebSocket连接
        if (socket) {
            socket.disconnect();
        }
    });
    
    // 初始化过滤器按钮事件
    initializeFilterButtons();
});

// 初始化过滤器按钮事件
function initializeFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的active类
            this.classList.add('active');
            // 更新人员列表
            updatePersonList(this.dataset.filter);
        });
    });
}

// 初始化WebSocket连接
function initializeWebSocket(cameraId) {
    // 创建Socket.IO连接
    socket = io();
    
    // 连接成功事件
    socket.on('connect', function() {
        console.log('WebSocket连接成功');
        // 加入特定摄像头的房间
        socket.emit('join_camera', { camera_id: cameraId });
    });
    
    // 加入房间成功事件
    socket.on('joined', function(data) {
        console.log('成功加入摄像头房间:', data);
    });
    
    // 检测事件
    socket.on('detection_event', function(data) {
        console.log('收到检测事件:', data);
        // 处理检测到的人物
        if (data.detection_type === 'person') {
            handlePersonDetection(data);
        }
    });
    
    // 错误事件
    socket.on('error', function(error) {
        console.error('WebSocket错误:', error);
    });
    
    // 断开连接事件
    socket.on('disconnect', function() {
        console.log('WebSocket连接已断开');
    });
}

// 处理人物检测事件
function handlePersonDetection(personData) {
    // 创建人物记录对象
    const person = {
        id: personData.id,
        name: `Person_${personData.id}`,
        time: new Date(), // 使用当前时间
        status: personData.status
    };
    
    // 添加到人物记录列表
    personRecords.unshift(person); // 添加到列表开头
    
    // 只保留最近的50条记录
    if (personRecords.length > 50) {
        personRecords = personRecords.slice(0, 50);
    }
    
    // 更新UI
    updatePersonList(document.querySelector('.filter-btn.active').dataset.filter);
    updateDetectionStats();
    addDetectionEvent(person);
    
    // 更新最后更新时间
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
}

// 更新检测统计信息
function updateDetectionStats() {
    // 更新人数统计
    document.getElementById('people-count').textContent = personRecords.length;
    
    // 更新异常事件数量
    const alertCount = personRecords.filter(p => p.status === 'suspicious').length;
    document.getElementById('alert-count').textContent = alertCount;
}

// 添加检测事件到事件列表
function addDetectionEvent(person) {
    const eventsList = document.getElementById('events-list');
    const eventItem = document.createElement('div');
    eventItem.className = `event-item ${person.status}`;
    eventItem.innerHTML = `
        <div class="event-time">${person.time.toLocaleTimeString()}</div>
        <div class="event-info">
            <span>检测到${person.status === 'normal' ? '正常' : '可疑'}人员</span>
            <span class="event-id">ID: ${person.id}</span>
        </div>
    `;
    
    // 添加到列表顶部
    if (eventsList.firstChild) {
        eventsList.insertBefore(eventItem, eventsList.firstChild);
    } else {
        eventsList.appendChild(eventItem);
    }
    
    // 限制显示的事件数量
    if (eventsList.children.length > 20) {
        eventsList.removeChild(eventsList.lastChild);
    }
}

// 显示人物跟踪信息
function showTracking(personId) {
    // 查找人物记录
    const person = personRecords.find(p => p.id === personId);
    if (!person) return;
    
    // 更新当前跟踪的人
    currentTrackingPerson = person;
    
    // 更新UI以高亮显示选中的人
    updatePersonList(document.querySelector('.filter-btn.active').dataset.filter);
    
    // 这里可以添加在视频上显示跟踪框的代码
    console.log('跟踪人物:', person);
}

// 更新人员列表
function updatePersonList(filter = 'all') {
    const personList = document.getElementById('person-list');
    const filteredPersons = filter === 'all' 
        ? personRecords 
        : personRecords.filter(person => person.status === filter);
    
    personList.innerHTML = filteredPersons.map(person => `
        <div class="person-item ${currentTrackingPerson && currentTrackingPerson.id === person.id ? 'active' : ''}" 
             onclick="showTracking(${person.id})">
            <div class="person-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="person-info">
                <div class="person-name">${person.name}</div>
                <div class="person-time">${person.time.toLocaleTimeString()}</div>
            </div>
            <div class="person-status ${person.status}">
                ${person.status === 'normal' ? '正常' : '可疑'}
            </div>
        </div>
    `).join('');
}

// 加载摄像头数据
function loadCameraData(cameraId) {
    console.log('正在加载摄像头数据, ID:', cameraId);
    
    // 从API获取摄像头数据
    fetch(`/api/user-cameras/${cameraId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }
            return response.json();
        })
        .then(camera => {
            console.log('获取到摄像头数据:', camera);
            
            // 更新摄像头信息
            updateCameraInfo(camera);
            
            // 播放视频流
            const vidoeElement = document.querySelector('.videoElement');
            playFlvVideo(camera.stream_url,vidoeElement);
            
            
        })
        .catch(error => {
            console.error('获取摄像头数据失败:', error);
        });
}

// 更新摄像头信息
function updateCameraInfo(camera) {
    const cameraTitle = document.getElementById('camera-title');
    const cameraStatusText = document.getElementById('camera-status-text');
    
    if (cameraTitle) {
        cameraTitle.textContent = camera.camera_name || '未知摄像头';
        document.title = `${camera.camera_name || '未知摄像头'} - 监控详情`;
    }
    
    if (cameraStatusText) {
        cameraStatusText.textContent = camera.status || '未知状态';
    }
    

}



