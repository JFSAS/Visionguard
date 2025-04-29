/**
 * 人物轨迹数据库页面脚本
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    let currentPage = 1;
    let totalPages = 1;
    let selectedPersonId = null;
    let sortBy = 'last_seen';
    let sortOrder = 'desc';
    let currentVideoTask = null;
    
    // DOM 元素
    const personsGrid = document.getElementById('persons-grid');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('person-search');
    const noSelectionMessage = document.getElementById('no-selection-message');
    const personDetails = document.getElementById('person-details');
    const generateVideoBtn = document.getElementById('generate-video-btn');
    const viewStatisticsBtn = document.getElementById('view-statistics-btn');
    const videoModal = document.getElementById('video-modal');
    const statisticsModal = document.getElementById('statistics-modal');
    const timeStartInput = document.getElementById('time-start');
    const timeEndInput = document.getElementById('time-end');
    const applyFilterBtn = document.getElementById('apply-filter');
    const cameraSelect = document.getElementById('camera-select');
    
    // 添加排序下拉菜单交互
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    dropdownToggle.addEventListener('click', function() {
        const dropdown = this.parentElement;
        dropdown.classList.toggle('active');
    });
    
    // 关闭下拉菜单的点击事件
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            const dropdown = document.querySelector('.dropdown');
            if (dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        }
    });
    
    // 排序选项点击事件
    const sortLinks = document.querySelectorAll('.dropdown-menu a');
    sortLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新活动状态
            sortLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // 获取排序参数
            sortBy = this.getAttribute('data-sort');
            sortOrder = this.getAttribute('data-order');
            
            // 更新下拉菜单显示
            dropdownToggle.innerHTML = `<i class="fas fa-sort"></i> ${getSortText(sortBy, sortOrder)}`;
            
            // 重新加载数据
            currentPage = 1;
            loadPersonsList();
            
            // 关闭下拉菜单
            document.querySelector('.dropdown').classList.remove('active');
        });
    });
    
    // 获取排序文本
    function getSortText(sort, order) {
        switch(sort) {
            case 'first_seen':
                return '首次出现' + (order === 'asc' ? '↑' : '↓');
            case 'appearance_count':
                return '出现次数' + (order === 'asc' ? '↑' : '↓');
            case 'last_seen':
            default:
                return '最近出现' + (order === 'asc' ? '↑' : '↓');
        }
    }
    
    // 初始化排序文本
    dropdownToggle.innerHTML = `<i class="fas fa-sort"></i> ${getSortText(sortBy, sortOrder)}`;
    
    // 搜索按钮点击事件
    searchBtn.addEventListener('click', function() {
        // 实现搜索功能
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            // TODO: 实现搜索API调用
            alert('搜索功能尚未实现: ' + searchTerm);
        } 
    });
    
    // 搜索框回车事件
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });
    
    // 分页按钮点击事件
    prevPageBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            loadPersonsList();
        }
    });
    
    nextPageBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            loadPersonsList();
        }
    });
    

    
    // 查看统计按钮点击事件
    viewStatisticsBtn.addEventListener('click', function() {
        if (!selectedPersonId) return;
        
        // 显示统计模态窗口
        statisticsModal.classList.add('active');
        
        // 加载统计数据
        loadPersonStatistics(selectedPersonId);
    });
    
    // 应用筛选按钮点击事件
    applyFilterBtn.addEventListener('click', function() {
        if (!selectedPersonId) return;
        
        // 加载人物轨迹，应用筛选条件
        loadPersonTrajectory(selectedPersonId);
    });
    
    // 模态窗口关闭按钮点击事件
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 关闭包含此按钮的模态窗口
            const modal = this.closest('.modal');
            modal.classList.remove('active');
            
            // 如果是视频模态窗口，停止视频播放
            if (modal.id === 'video-modal') {
                const videoElement = document.getElementById('video-element');
                if (videoElement) {
                    videoElement.pause();
                    videoElement.src = '';
                }
                
                // 清除定时器
                if (currentVideoTask) {
                    clearInterval(currentVideoTask.interval);
                    currentVideoTask = null;
                }
            }
        });
    });
    
    // 加载人物列表
    function loadPersonsList() {
        // 显示加载状态
        personsGrid.innerHTML = '<div class="loading">加载中...</div>';
        
        // 发起API请求
        fetch(`/api/person_trajectory/list?page=${currentPage}&per_page=6&sort_by=${sortBy}&order=${sortOrder}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 更新分页信息
                    totalPages = data.pages || Math.ceil(data.total_count / 6);
                    currentPageSpan.textContent = currentPage;
                    totalPagesSpan.textContent = totalPages;
                    
                    // 更新分页按钮状态
                    prevPageBtn.disabled = currentPage <= 1;
                    nextPageBtn.disabled = currentPage >= totalPages;
                    
                    // 清空列表
                    personsGrid.innerHTML = '';
                    
                    // 检查是否有数据
                    if (!data.persons || data.persons.length === 0) {
                        personsGrid.innerHTML = '<div class="no-data">没有找到人物数据</div>';
                        return;
                    }
                    
                    // 渲染人物列表
                    data.persons.forEach(person => {
                        const personCard = createPersonCard(person);
                        personsGrid.appendChild(personCard);
                    });
                } else {
                    // 显示错误信息
                    personsGrid.innerHTML = `<div class="error">加载失败: ${data.message || '未知错误'}</div>`;
                }
            })
            .catch(error => {
                console.error('加载人物列表失败:', error);
                personsGrid.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
            });
    }
    
    // 创建人物卡片元素
    function createPersonCard(person) {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.setAttribute('data-person-id', person.person_id);
        
        // 如果是当前选中的人物，添加选中样式
        if (selectedPersonId === person.person_id) {
            card.classList.add('selected');
        }
        
        // 格式化时间
        const lastSeenDate = new Date(person.last_seen * 1000);
        const formattedDate = formatDateTime(lastSeenDate);
        
        card.innerHTML = `
            <div class="person-thumb">
                <img src="${person.thumbnail_url}" alt="人物 ${person.person_id}">
            </div>
            <div class="person-meta">
                <h4 class="person-id">人物 ${person.person_id}</h4>
                <p class="last-seen">最后出现: ${formattedDate}</p>
            </div>
        `;
        
        // 添加点击事件
        card.addEventListener('click', function() {
            // 移除其他卡片的选中状态
            document.querySelectorAll('.person-card').forEach(p => {
                p.classList.remove('selected');
            });
            
            // 添加当前卡片的选中状态
            this.classList.add('selected');
            
            // 更新选中的人物ID
            selectedPersonId = person.person_id;
            
            // 加载人物详情
            loadPersonTrajectory(selectedPersonId);
        });
        
        return card;
    }
    
    // 加载人物轨迹
    function loadPersonTrajectory(personId) {
        // 隐藏提示信息，显示详情面板
        noSelectionMessage.style.display = 'none';
        personDetails.classList.remove('hidden');
        
        // 获取筛选条件
        let url = `/api/person_trajectory/person/${personId}/trajectory`;
        const params = new URLSearchParams();
        
        if (timeStartInput.value) {
            const startTimestamp = new Date(timeStartInput.value).getTime() / 1000;
            params.append('time_start', startTimestamp);
        }
        
        if (timeEndInput.value) {
            const endTimestamp = new Date(timeEndInput.value).getTime() / 1000;
            params.append('time_end', endTimestamp);
        }
        
        if (cameraSelect.value) {
            params.append('camera_id', cameraSelect.value);
        }
        
        // 添加参数到URL
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        // 显示加载状态
        document.getElementById('appearance-timeline').innerHTML = '<div class="loading">加载轨迹数据中...</div>';
        
        // 发起API请求
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 更新人物基本信息
                    updatePersonInfo(data);
                    
                    // 渲染时间轴
                    renderTimeline(data.appearances);
                    
                    // 更新位置分布图
                    updateLocationMap(data.appearances);
                    
                    // 更新摄像头下拉选择
                    updateCameraSelect(data.appearances);
                } else {
                    document.getElementById('appearance-timeline').innerHTML = 
                        `<div class="error">加载轨迹失败: ${data.message || '未知错误'}</div>`;
                }
            })
            .catch(error => {
                console.error('加载人物轨迹失败:', error);
                document.getElementById('appearance-timeline').innerHTML = 
                    `<div class="error">加载轨迹失败: ${error.message}</div>`;
            });
    }
    
    // 更新人物基本信息
    function updatePersonInfo(data) {
        // 更新ID
        document.querySelector('#person-id span').textContent = data.person_id;
        
        // 更新图像
        const mainImage = document.getElementById('person-main-image');
        mainImage.src = `/api/person_trajectory/person/${data.person_id}/thumbnail`;
        
        
        // 更新首次和最后出现时间
        if (data.first_seen) {
            document.getElementById('first-seen').textContent = formatDateTime(new Date(data.first_seen * 1000));
        } else {
            document.getElementById('first-seen').textContent = '未知';
        }
        
        if (data.last_seen) {
            document.getElementById('last-seen').textContent = formatDateTime(new Date(data.last_seen * 1000));
        } else {
            document.getElementById('last-seen').textContent = '未知';
        }
        
        // 更新出现次数
        document.getElementById('appearance-count').textContent = data.appearance_count || 0;
        
        // 更新常见位置
        if (data.appearances && data.appearances.length > 0) {
            // 统计每个位置的出现次数
            const locationCounts = {};
            data.appearances.forEach(app => {
                const locationName = app.camera_name || `摄像头 ${app.camera_id}`;
                if (!locationCounts[locationName]) {
                    locationCounts[locationName] = 0;
                }
                locationCounts[locationName]++;
            });
            
            // 找出出现次数最多的位置
            let maxCount = 0;
            let commonLocation = '未知';
            
            for (const [location, count] of Object.entries(locationCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    commonLocation = location;
                }
            }
            
            document.getElementById('common-location').textContent = commonLocation;
        } else {
            document.getElementById('common-location').textContent = '未知';
        }
    }
    
    // 渲染时间轴
    function renderTimeline(appearances) {
        const timeline = document.getElementById('appearance-timeline');
    timeline.innerHTML = '';
    
    if (!appearances || appearances.length === 0) {
        timeline.innerHTML = '<div class="no-data">没有轨迹数据</div>';
        return;
    }
    
    // 按时间排序
    appearances.sort((a, b) => a.start_time - b.start_time);
    
    // 创建时间轴项目
    appearances.forEach(app => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        const startTimestamp = new Date(app.start_time * 1000);
        const endTimestamp = new Date(app.end_time * 1000);
        const duration = Math.round((app.end_time - app.start_time) / 60); // 分钟
        const locationName = app.camera_name || `摄像头 ${app.camera_id}`;
        
        // 为不同时长的出现设置不同的样式
        let durationClass = '';
        if (duration > 30) durationClass = 'long-duration';
        else if (duration > 5) durationClass = 'medium-duration';
        else durationClass = 'short-duration';
        
        const buttonId = `video-btn-${app.camera_id}-${Math.floor(app.start_time)}`;

        timelineItem.innerHTML = `
            <div class="timeline-item-header">
                <div class="timeline-timestamp">${formatDateTime(startTimestamp)}</div>
                <div class="timeline-duration ${durationClass}">持续${duration}分钟</div>
                <div class="timeline-location">${locationName}</div>
            </div>
            <div class="timeline-content">
                <div class="timeline-thumb">
                    <img src="/api/person_trajectory/frame/${app.camera_id}/${app.best_frame}/person/${selectedPersonId}/image" alt="出现记录">
                </div>
                <div class="timeline-details">
                    <p>开始时间: ${formatDateTime(startTimestamp)}</p>
                    <p>结束时间: ${formatDateTime(endTimestamp)}</p>
                    <p>总帧数: ${app.frame_count}</p>
                    <p>置信度: ${(app.best_confidence || 0).toFixed(2)}</p>
                    <div class="timeline-actions">
                        <button id="${buttonId}" class="btn btn-small btn-outline view-event-btn" 
                                data-camera-id="${app.camera_id}" 
                                data-start="${app.start_time}"
                                data-end="${app.end_time}">
                            <i class="fas fa-film"></i> 查看活动视频
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        timeline.appendChild(timelineItem);

    createVideoSegmentTaskAsync(selectedPersonId, app.camera_id, app.start_time, app.end_time, buttonId);

    });
    }
    
    // 更新位置分布图
    function updateLocationMap(appearances) {
        // TODO: 实现位置分布图
        const locationMap = document.getElementById('location-map');
        locationMap.innerHTML = '<div class="placeholder">位置分布图（功能尚未实现）</div>';
    }
    
    // 更新摄像头选择下拉框
    function updateCameraSelect(appearances) {
        // 保存当前选中的值
        const currentValue = cameraSelect.value;
        
        // 清空选项（保留第一个）
        while (cameraSelect.options.length > 1) {
            cameraSelect.remove(1);
        }
        
        if (!appearances || appearances.length === 0) {
            return;
        }
        
        // 提取唯一的摄像头ID和名称
        const cameras = new Map();
        appearances.forEach(app => {
            if (!cameras.has(app.camera_id)) {
                const name = app.camera_name || `摄像头 ${app.camera_id}`;
                cameras.set(app.camera_id, name);
            }
        });
        
        // 添加摄像头选项
        cameras.forEach((name, id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            cameraSelect.appendChild(option);
        });
        
        // 恢复之前选中的值（如果存在）
        if (currentValue && [...cameras.keys()].includes(Number(currentValue))) {
            cameraSelect.value = currentValue;
        }
    }
    
    // 加载人物统计数据
    function loadPersonStatistics(personId) {
        fetch(`/api/person_trajectory/person/${personId}/statistics`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 渲染时间分布图表
                    renderTimeDistributionChart(data.time_distribution);
                    
                    // TODO: 渲染摄像头分布图表
                    document.getElementById('camera-distribution-chart').innerHTML = 
                        '<div class="placeholder">摄像头分布图表（功能尚未实现）</div>';
                } else {
                    document.getElementById('time-distribution-chart').innerHTML = 
                        `<div class="error">加载统计数据失败: ${data.message || '未知错误'}</div>`;
                }
            })
            .catch(error => {
                console.error('加载统计数据失败:', error);
                document.getElementById('time-distribution-chart').innerHTML = 
                    `<div class="error">加载统计数据失败: ${error.message}</div>`;
            });
    }
    
    // 渲染时间分布图表
    function renderTimeDistributionChart(timeDistribution) {
        // TODO: 实现图表渲染，这里用简单的方式展示
        const chartContainer = document.getElementById('time-distribution-chart');
        chartContainer.innerHTML = '';
        
        if (!timeDistribution || timeDistribution.length === 0) {
            chartContainer.innerHTML = '<div class="no-data">没有时间分布数据</div>';
            return;
        }
        
        // 创建简单的条形图
        const maxCount = Math.max(...timeDistribution.map(item => item.count));
        const barChart = document.createElement('div');
        barChart.className = 'time-bar-chart';
        
        timeDistribution.forEach(item => {
            const height = item.count > 0 ? (item.count / maxCount * 150) : 1;
            
            const bar = document.createElement('div');
            bar.className = 'time-bar';
            bar.style.height = `${height}px`;
            bar.title = `${item.hour}时: ${item.count}次`;
            
            const label = document.createElement('div');
            label.className = 'time-label';
            label.textContent = item.hour;
            
            const barContainer = document.createElement('div');
            barContainer.className = 'time-bar-container';
            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            
            barChart.appendChild(barContainer);
        });
        
        chartContainer.appendChild(barChart);
        
        // 添加一些CSS
        const style = document.createElement('style');
        style.textContent = `
            .time-bar-chart {
                display: flex;
                align-items: flex-end;
                height: 180px;
                padding-top: 20px;
            }
            .time-bar-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .time-bar {
                width: 70%;
                background-color: var(--primary-color);
                border-radius: 3px 3px 0 0;
                min-height: 1px;
            }
            .time-label {
                margin-top: 5px;
                font-size: 0.7rem;
                color: var(--text-secondary);
            }
        `;
        document.head.appendChild(style);
    }
    
    // 异步创建视频片段任务并监控状态
function createVideoSegmentTaskAsync(personId, cameraId, startTime, endTime, buttonId) {
    // 发起API请求
    fetch(`/api/person_trajectory/person/${personId}/video_segment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            camera_id: cameraId,
            start_time: parseFloat(startTime),
            end_time: parseFloat(endTime)
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 保存任务ID并开始轮询任务状态
            // log
            console.log(data.task_id, data.message)

            const taskId = data.task_id;
            monitorVideoTaskStatus(taskId, buttonId);
        } else {
            updateButtonStatus(buttonId, 'error', data.message || '未知错误');
        }
    })
    .catch(error => {
        console.error('创建视频片段任务失败:', error);
        updateButtonStatus(buttonId, 'error', error.message);
    });
}

   // 监控视频任务状态
function monitorVideoTaskStatus(taskId, buttonId) {
    // 使用递归轮询而不是setInterval，以避免任务过多时的性能问题
    function checkStatus() {
        fetch(`/api/person_trajectory/video/status/${taskId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.status === 'completed') {
                        // 任务完成，更新按钮为可播放状态
                        updateButtonStatus(buttonId, 'ready', data.video_url);
                    } else if (data.status === 'failed') {
                        // 任务失败
                        console.error("加载视频失败",taskId);
                        updateButtonStatus(buttonId, 'error', data.error_message || '处理失败');
                    } else {
                        // 任务进行中，更新进度
                        updateButtonStatus(buttonId, 'processing', data.progress);
                        
                        // 继续轮询
                        setTimeout(checkStatus, 2000);
                    }
                } else {
                    updateButtonStatus(buttonId, 'error', data.message || '状态检查失败');
                }
            })
            .catch(error => {
                console.error('检查任务状态失败:', error);
                updateButtonStatus(buttonId, 'error', error.message);
            });
    }
    
    // 开始检查状态
    setTimeout(checkStatus, 1000);
}
   
// 更新按钮状态
function updateButtonStatus(buttonId, status, data) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    switch(status) {
        case 'processing':
            // 更新处理进度
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 处理中 ${data}%`;
            button.disabled = true;
            break;
            
        case 'ready':
            // 视频准备完毕，可以播放
            button.innerHTML = `<i class="fas fa-film"></i> 查看活动视频`;
            button.classList.add('btn-success');
            button.disabled = false;
            button.setAttribute('data-video-url', data);
            
            // 添加点击事件监听
            button.onclick = function() {
                showVideoPlayer(data);
            };
            break;
            
        case 'error':
            // 发生错误
            button.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 处理失败`;
            button.classList.add('btn-danger');
            button.title = data; // 在工具提示中显示错误信息
            button.disabled = true;
            break;
    }
}
    // 显示视频播放器
function showVideoPlayer(videoUrl) {
    // 显示视频模态窗口
    const videoModal = document.getElementById('video-modal');
    videoModal.classList.add('active');
    
    // 直接加载视频，不显示加载界面
    document.getElementById('video-loading').style.display = 'none';
    document.getElementById('video-player').classList.remove('hidden');
    
    // 加载视频
    const videoPlayer = document.getElementById('video-player');
    videoPlayer.innerHTML  = `
    <video controls="" muted="" autoplay="" id="video-element">
                                <source id="video-source" src="${videoUrl}" type="video/mp4">
                                您的浏览器不支持HTML5视频播放
                            </video>
    `
}



    // 格式化日期时间
    function formatDateTime(date) {
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    // 初始加载人物列表
    loadPersonsList();
}); 


