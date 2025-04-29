// 全局变量
let socket = null;
let currentCameraId = null;
let personRecords = []; // 存储人员记录
let currentTrackingPerson = null; // 当前跟踪的人
let videoRender = null; // 视频渲染器实例
let latestDetectionFrameNumber = -1; // 最新收到的检测数据帧号
let isWaitingForData = false; // 是否正在等待检测数据
const knownPersonIds = new Set(); // 存储已知的人物ID集合
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
    
    

});


// 创建视频渲染器
function createVideoRender(streamUrl) {
    // 获取视频容器
    const videoContainer = document.querySelector('.video-player');
    
    // 清空容器内容
    videoContainer.innerHTML = '';
    
    // 创建渲染器实例
    videoRender = new FlvVideoRender({
        showFrameNumber: true,
        decodingInterval: 1, // 每一帧都解码
        debugMode: false,
                // 配置人物检测回调
                onNewPersonDetected: handleNewPersonsDetected,
                onPersonReappear: handlePersonsReappear,
                
                // 配置人物跟踪选项
                personTrackingOptions: {
                    reappearThreshold: 30, // 消失超过30帧才算重新出现
                    trackingEnabled: true,
                    maxTrackedPersons: 100
                }
    });
    
    // 创建渲染视频
    const renderedVideo = videoRender.createRenderedVideo(
        streamUrl, 
        videoContainer, 
        {
            isLive: true,
            hasAudio: false
        }
    );
    videoRender.setCameraId(currentCameraId);
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
        if (videoRender.displayCanvas.requestFullscreen) {
            videoRender.displayCanvas.requestFullscreen();
        } else if (videoRender.displayCanvas.webkitRequestFullscreen) {
            videoRender.displayCanvas.webkitRequestFullscreen();
        }
    });
    
    // 渲染切换按钮事件
    document.getElementById('render-toggle-btn').addEventListener('click', function() {
        const isRendering = videoRender.isRendering;
        videoRender.toggleRendering(!isRendering);
        this.innerHTML = !isRendering 
            ? '<i class="fas fa-eye"></i>' 
            : '<i class="fas fa-eye-slash"></i>';
    });
    
    console.log('视频渲染器创建成功');
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
function addDetectionEvent(person, isNewPerson = false) {
    const eventsList = document.getElementById('events-list');
    const eventItem = document.createElement('div');
    
    // 根据是否为新人物设置不同的样式
    eventItem.className = `event-item ${person.status} ${isNewPerson ? 'new-person' : 'reappear-person'}`;
    
    eventItem.innerHTML = `
        <div class="event-time">${person.time.toLocaleTimeString()}</div>
        <div class="event-info">
            <span>${isNewPerson ? '新出现' : '再次出现'} ${person.status === 'normal' ? '正常' : '可疑'}人员</span>
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
    
    // 更新最后更新时间
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
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
    if (person.frameNumber && person.bbox && videoRender) {
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
        videoRender.updateDetectionData(highlightData);
    }
}

// 更新人物列表
function updatePersonList(filter = 'all') {
    const personList = document.getElementById('person-list');
    personList.innerHTML = '';
    
    // 过滤人物
    const filteredPersons = personRecords.filter(person => {
        if (filter === 'all') return true;
        if (filter === 'normal') return person.status === 'normal';
        if (filter === 'suspicious') return person.status === 'suspicious';
        return true;
    });
    
    // 创建人物项
    filteredPersons.forEach(person => {
        const personItem = document.createElement('div');
        personItem.className = `person-item ${person.status} ${person.isNew ? 'new-person' : ''} ${person.isReappear ? 'reappear-person' : ''}`;
        personItem.innerHTML = `
            <div class="person-info">
                <div class="person-id">ID: ${person.id}</div>
                <div class="person-time">检测时间: ${person.time.toLocaleTimeString()}</div>
                <div class="person-frame">帧号: ${person.frameNumber || 'N/A'}</div>
                <div class="person-status">状态: ${person.status === 'normal' ? '正常' : '可疑'}</div>
            </div>
        `;
        if (person.id == currentTrackingPerson?.id) {
            personItem.classList.add('selected');
        }

            // 添加点击事件，选中当前人物
        personItem.addEventListener('click', function() {
            // 移除其他项目的选中状态
            document.querySelectorAll('.person-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            
            // 添加选中状态
            personItem.classList.add('selected');
            
            // 设置当前跟踪的人物
            currentTrackingPerson = person;
            
            // 可以添加额外操作，如显示人物详情等
        });
        
        personList.appendChild(personItem);
    });
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
            const cameraTitle = document.getElementById('camera-title');
            const cameraStatusText = document.getElementById('camera-status-text');
            
            if (cameraTitle) {
                cameraTitle.textContent = camera.camera_name || '未知摄像头';
                document.title = `${camera.camera_name || '未知摄像头'} - 监控详情`;
            }
            
            if (cameraStatusText) {
                cameraStatusText.textContent = camera.status || '未知状态';
            }
            
            // 创建视频渲染器
            createVideoRender(camera.stream_url);
        })
        .catch(error => {
            console.error('获取摄像头数据失败:', error);
        });
}




// 处理新检测到的人物
function handleNewPersonsDetected(newPersons) {
    if (!Array.isArray(newPersons) || newPersons.length === 0) return;
    
    // 处理每个新人物
    newPersons.forEach(person => {
        const personId = person.personId;
        
        // 创建人物记录对象
        const personRecord = {
            id: personId,
            name: `Person_${personId}`,
            time: person.timestamp || new Date(),
            status: person.status,
            frameNumber: person.frameNumber,
            bbox: person.bbox,
            isNew: true // 标记为新人物
        };
        
        // 添加到已知ID集合
        knownPersonIds.add(personId);
        
        // 添加到人物记录列表开头
        personRecords.unshift(personRecord);
        
        // 添加到事件列表
        addDetectionEvent(personRecord, true);
    });
    
    // 限制记录数量
    if (personRecords.length > 50) {
        personRecords = personRecords.slice(0, 50);
    }
    
    // 更新UI
    updatePersonList();
    updateDetectionStats();
}

// 处理重新出现的人物
function handlePersonsReappear(reappearedPersons) {
    if (!Array.isArray(reappearedPersons) || reappearedPersons.length === 0) return;
    
    // 处理每个重新出现的人物
    reappearedPersons.forEach(person => {
        const personId = person.personId;
        
        // 查找是否已存在该人物记录
        const existingIndex = personRecords.findIndex(p => p.id === personId);
        
        if (existingIndex !== -1) {
            // 已存在记录，更新信息并移到顶部
            const existingRecord = personRecords[existingIndex];
            existingRecord.time = person.timestamp || new Date();
            existingRecord.status = person.status;
            existingRecord.frameNumber = person.frameNumber;
            existingRecord.bbox = person.bbox;
            existingRecord.isNew = false;
            existingRecord.isReappear = true; // 标记为重新出现
            
            // 从当前位置移除并添加到开头
            personRecords.splice(existingIndex, 1);
            personRecords.unshift(existingRecord);
            
            // 添加到事件列表
            addDetectionEvent(existingRecord, false);
        } else {
            // 不存在记录，创建新记录（异常情况）
            const personRecord = {
                id: personId,
                name: `Person_${personId}`,
                time: person.timestamp || new Date(),
                status: person.status,
                frameNumber: person.frameNumber,
                bbox: person.bbox,
                isNew: false,
                isReappear: true
            };
            
            personRecords.unshift(personRecord);
            addDetectionEvent(personRecord, false);
        }
    });
    
    // 更新UI
    updatePersonList();
    updateDetectionStats();
}





