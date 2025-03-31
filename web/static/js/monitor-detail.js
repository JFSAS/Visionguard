// 获取URL参数
const urlParams = new URLSearchParams(window.location.search);
const cameraId = urlParams.get('id');
const cameraTitle = urlParams.get('title');

// 更新页面标题和状态
document.getElementById('camera-title').textContent = cameraTitle || '监控点详情';

// 视频播放器控制
const mainVideo = document.getElementById('main-video');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const snapshotBtn = document.getElementById('snapshot-btn');

// 人员跟踪相关变量
let trackingBoxes = document.getElementById('tracking-boxes');
let activeTrackingBox = null;
let currentTrackingPerson = null;

// 模拟时间控制
let simulationTime = new Date();
let simulationInterval;

// 全屏控制
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        mainVideo.parentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

// 截图功能
snapshotBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = mainVideo.videoWidth;
    canvas.height = mainVideo.videoHeight;
    canvas.getContext('2d').drawImage(mainVideo, 0, 0);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `snapshot-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// 模拟人员数据
let personRecords = [
    {
        id: 1,
        name: '张三',
        time: new Date(Date.now() - 60000),
        status: 'normal'
    },
    {
        id: 2,
        name: '李四',
        time: new Date(Date.now() - 180000),
        status: 'suspicious'
    },
    {
        id: 3,
        name: '王五',
        time: new Date(Date.now() - 300000),
        status: 'normal'
    }
];

// 随机生成中文姓名
function generateChineseName() {
    const surnames = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴'];
    const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋'];
    return surnames[Math.floor(Math.random() * surnames.length)] + 
           names[Math.floor(Math.random() * names.length)];
}

// 生成新的检测记录
function generateNewDetection() {
    const isSuspicious = Math.random() < 0.2; // 20%的概率是可疑人员
    return {
        id: personRecords.length + 1,
        name: generateChineseName(),
        time: new Date(simulationTime),
        status: isSuspicious ? 'suspicious' : 'normal'
    };
}

// 更新模拟时间
function updateSimulationTime() {
    simulationTime = new Date(simulationTime.getTime() + 1000); // 每秒增加1秒
    document.getElementById('last-update').textContent = simulationTime.toLocaleTimeString();
}

// 模拟实时数据更新
function updateDetectionData() {
    // 更新人数统计
    document.getElementById('people-count').textContent = personRecords.length;
    
    // 更新异常事件数
    const suspiciousCount = personRecords.filter(person => person.status === 'suspicious').length;
    document.getElementById('alert-count').textContent = suspiciousCount;
    
    // 更新最后更新时间
    updateSimulationTime();
    
    // 更新事件列表
    updateEventsList();
    
    // 更新人员列表
    updatePersonList();
}

// 更新事件列表
function updateEventsList() {
    const eventsList = document.getElementById('events-list');
    const recentPersons = personRecords.slice(-3).reverse(); // 获取最新的3条记录
    
    const events = recentPersons.map(person => ({
        type: person.status === 'suspicious' ? 'danger' : 'success',
        icon: person.status === 'suspicious' ? 'user-slash' : 'check-circle',
        title: `${person.name} ${person.status === 'suspicious' ? '被标记为可疑人员' : '正常通行'}`,
        time: person.time.toLocaleTimeString()
    }));
    
    eventsList.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-icon ${event.type}">
                <i class="fas fa-${event.icon}"></i>
            </div>
            <div class="event-content">
                <div class="event-title">${event.title}</div>
                <div class="event-time">${event.time}</div>
            </div>
        </div>
    `).join('');
}

// 生成随机位置（模拟检测位置）
function generateRandomPosition() {
    return {
        x: Math.random() * 80 + 10, // 10% 到 90% 之间
        y: Math.random() * 80 + 10,
        width: Math.random() * 15 + 5, // 5% 到 20% 之间
        height: Math.random() * 15 + 5
    };
}

// 创建跟踪框
function createTrackingBox(person) {
    console.log('创建跟踪框:', person);
    const box = document.createElement('div');
    box.className = `tracking-box ${person.status}`;
    box.dataset.personId = person.id;
    
    // 添加标签
    const label = document.createElement('div');
    label.className = 'tracking-label';
    label.textContent = person.name;
    box.appendChild(label);
    
    // 设置位置
    const pos = generateRandomPosition();
    console.log('跟踪框位置:', pos);
    box.style.left = `${pos.x}%`;
    box.style.top = `${pos.y}%`;
    box.style.width = `${pos.width}%`;
    box.style.height = `${pos.height}%`;
    
    return box;
}

// 更新跟踪框位置
function updateTrackingBoxPosition(box) {
    const pos = generateRandomPosition();
    box.style.left = `${pos.x}%`;
    box.style.top = `${pos.y}%`;
    box.style.width = `${pos.width}%`;
    box.style.height = `${pos.height}%`;
    console.log('跟踪框新位置:', pos);
}

// 显示跟踪框
function showTrackingBox(person) {
    console.log('开始显示跟踪框:', person);
    
    // 清除现有的跟踪框
    if (activeTrackingBox) {
        console.log('清除现有跟踪框');
        clearTrackingBox();
    }
    
    // 创建新的跟踪框
    activeTrackingBox = createTrackingBox(person);
    trackingBoxes.appendChild(activeTrackingBox);
    console.log('跟踪框已添加到DOM');
    
    // 开始动画
    let animationInterval = setInterval(() => {
        if (activeTrackingBox && activeTrackingBox.parentElement) {
            console.log('更新跟踪框位置:', person.name);
            updateTrackingBoxPosition(activeTrackingBox);
        } else {
            console.log('停止跟踪框动画');
            clearInterval(animationInterval);
        }
    }, 2000); // 每2秒更新一次位置
    
    // 保存interval ID以便后续清除
    activeTrackingBox.dataset.animationInterval = animationInterval;
    console.log('跟踪框动画已启动');
}

// 清除跟踪框
function clearTrackingBox() {
    if (activeTrackingBox) {
        console.log('清除跟踪框');
        clearInterval(parseInt(activeTrackingBox.dataset.animationInterval));
        activeTrackingBox.remove();
        activeTrackingBox = null;
        console.log('跟踪框已清除');
    }
}

// 修改showTracking函数
function showTracking(personId) {
    console.log('开始跟踪人员, 人员ID:', personId);
    const person = personRecords.find(p => p.id === personId);
    if (!person) {
        console.error('未找到对应人员:', personId);
        return;
    }

    // 如果点击的是当前正在跟踪的人员，则停止跟踪
    if (currentTrackingPerson && currentTrackingPerson.id === personId) {
        console.log('点击当前跟踪人员，停止跟踪');
        currentTrackingPerson = null;
        clearTrackingBox();
        updatePersonList(); // 更新列表以移除active状态
        return;
    }

    // 更新当前跟踪人员
    currentTrackingPerson = person;
    console.log('当前跟踪人员:', person);
    
    // 显示跟踪框
    showTrackingBox(person);
    console.log('跟踪框已显示');
    
    // 更新列表以显示active状态
    updatePersonList();
}

// 修改initTracking函数
function initTracking() {
    console.log('初始化跟踪功能');
    
    // 为每个人员记录添加点击事件
    const personItems = document.querySelectorAll('.person-item');
    console.log('找到人员记录数量:', personItems.length);
    
    personItems.forEach(item => {
        item.addEventListener('click', () => {
            const personId = parseInt(item.dataset.personId);
            console.log('点击人员记录:', personId);
            showTracking(personId);
        });
    });
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

// 初始化筛选按钮事件
function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有按钮的active类
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的active类
            button.classList.add('active');
            // 更新列表
            updatePersonList(button.dataset.filter);
        });
    });
}

// 视频播放控制
mainVideo.addEventListener('play', () => {
    // 开始模拟时间更新
    simulationInterval = setInterval(() => {
        updateSimulationTime();
        
        // 随机添加新的检测记录
        if (Math.random() < 0.3) { // 30%的概率添加新记录
            const newPerson = generateNewDetection();
            personRecords.push(newPerson);
            updateDetectionData();
        }
    }, 1000);
});

mainVideo.addEventListener('pause', () => {
    // 暂停模拟时间更新
    clearInterval(simulationInterval);
});

mainVideo.addEventListener('ended', () => {
    // 视频结束时清除定时器
    clearInterval(simulationInterval);
});

// 页面加载时初始化数据
updateDetectionData();

// 在页面加载完成后初始化跟踪功能
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化跟踪功能');
    updateDetectionData();
    initTracking();
    initFilters();
    // 每秒更新一次数据
    setInterval(updateDetectionData, 1000);
}); 