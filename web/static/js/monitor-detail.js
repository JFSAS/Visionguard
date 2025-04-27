// 全局变量
let socket = null;
let currentCameraId = null;
let personRecords = []; // 存储人员记录
let currentTrackingPerson = null; // 当前跟踪的人
let videoRenderer = null; // 视频渲染器实例
let latestDetectionFrameNumber = -1; // 最新收到的检测数据帧号
let isWaitingForData = false; // 是否正在等待检测数据

// 同步控制参数
const SYNC_BUFFER_SIZE = 100; // 在恢复播放前需要积累的帧数 (修改为100)
const MAX_FRAME_GAP = 60; // 允许的最大帧号差距，超过此值会暂停

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


// 处理多人检测事件
function handlePersonsDetection(data) {
    // 如果没有人物数据，直接返回
    if (!Array.isArray(data.persons) || data.persons.length === 0) return;
    
    // 处理每个人物
    data.persons.forEach(person => {
        // 创建人物记录对象
        const personRecord = {
            id: person.person_id,
            name: `Person_${person.person_id}`,
            time: new Date(), // 使用当前时间
            status: person.status,
            frameNumber: data.frame_number, // 添加帧序号
            bbox: person.bbox // 保存边界框坐标
        };
        
        // 添加到人物记录列表
        personRecords.unshift(personRecord); // 添加到列表开头
    });
    
    // 只保留最近的50条记录
    if (personRecords.length > 50) {
        personRecords = personRecords.slice(0, 50);
    }
    
    // 更新UI
    updatePersonList(document.querySelector('.filter-btn.active').dataset.filter);
    updateDetectionStats();
    
    // 为每个人物添加事件
    data.persons.forEach(person => {
        const personRecord = {
            id: person.person_id,
            name: `Person_${person.person_id}`,
            time: new Date(),
            status: person.status,
            frameNumber: data.frame_number
        };
        addDetectionEvent(personRecord);
    });
    
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
            ${person.frameNumber ? `<span class="event-frame">帧: ${person.frameNumber}</span>` : ''}
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
    
    // 用渲染器处理跟踪高亮
    console.log('跟踪人物:', person);
    
    // 如果有帧号和边界框，高亮显示该人物
    if (person.frameNumber && person.bbox && videoRenderer) {
        const highlightData = {};
        highlightData[person.frameNumber] = [{
            x: person.bbox.x,
            y: person.bbox.y,
            width: person.bbox.width,
            height: person.bbox.height,
            person_id: person.id,
            label: `跟踪: ID:${person.id}`,
            color: 'yellow',
            lineWidth: 4
        }];
        videoRenderer.updateDetectionData(highlightData);
    }
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
            
            // 创建视频渲染器
            createVideoRenderer(camera.stream_url);
        })
        .catch(error => {
            console.error('获取摄像头数据失败:', error);
        });
}

// 创建视频渲染器
function createVideoRenderer(streamUrl) {
    // 获取视频容器
    const videoContainer = document.querySelector('.video-player');
    
    // 清空容器内容
    videoContainer.innerHTML = '';
    
    // 创建渲染器实例
    videoRenderer = new FlvVideoRenderer({
        showFrameNumber: true,
        decodingInterval: 1, // 每一帧都解码
        debugMode: false,
    });
    
    // 创建渲染视频
    const renderedVideo = videoRenderer.createRenderedVideo(
        streamUrl, 
        videoContainer, 
        {
            isLive: true,
            hasAudio: false
        }
    );
    videoRenderer.setCameraId(currentCameraId);
    // 添加控制按钮
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'video-controls';
    controlsDiv.innerHTML = `
        <button class="control-btn" id="fullscreen-btn" title="全屏">
            <i class="fas fa-expand"></i>
        </button>
        <button class="control-btn" id="render-toggle-btn" title="切换渲染">
            <i class="fas fa-eye"></i>
        </button>
        <button class="control-btn" id="sync-status-btn" title="同步状态">
            <i class="fas fa-sync-alt"></i>
            <span class="sync-status">同步中</span>
        </button>
    `;
    videoContainer.appendChild(controlsDiv);
    
    
    // 全屏按钮事件
    document.getElementById('fullscreen-btn').addEventListener('click', () => {
        if (videoRenderer.displayCanvas.requestFullscreen) {
            videoRenderer.displayCanvas.requestFullscreen();
        } else if (videoRenderer.displayCanvas.webkitRequestFullscreen) {
            videoRenderer.displayCanvas.webkitRequestFullscreen();
        }
    });
    
    // 渲染切换按钮事件
    document.getElementById('render-toggle-btn').addEventListener('click', function() {
        const isRendering = videoRenderer.isRendering;
        videoRenderer.toggleRendering(!isRendering);
        this.innerHTML = !isRendering 
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
    });
    
    console.log('视频渲染器创建成功');
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



