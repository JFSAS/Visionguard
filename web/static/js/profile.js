// Target Profile Display Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Setup file upload functionality
    setupFileUpload();
    
    // Setup description input with tags
    setupDescriptionInput();
    
    // Load mock results
    loadMockResults();
    
    // Setup search button
    document.getElementById('search-btn').addEventListener('click', function() {
        const searchBtn = this;
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜索中...';
        
        // Simulate search delay
        setTimeout(() => {
            showNotification('目标搜索完成，发现3处匹配结果', 'success');
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> 搜索目标';
            
            // Show results section
            document.querySelector('.results-container').style.display = 'block';
            
            // Scroll to results
            document.querySelector('.results-container').scrollIntoView({
                behavior: 'smooth'
            });
        }, 2500);
    });
});

// Setup file upload functionality
function setupFileUpload() {
    const uploadArea = document.querySelector('.upload-area');
    const fileInput = document.getElementById('file-input');
    const previewImg = document.querySelector('.upload-preview img');
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });
    
    function handleFile(file) {
        if (!file.type.match('image.*')) {
            showNotification('请上传图片文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            document.querySelector('.upload-preview').style.display = 'block';
            showNotification('图片上传成功', 'success');
        };
        reader.readAsDataURL(file);
    }
}

// Setup description input with tags
function setupDescriptionInput() {
    const descriptionInput = document.getElementById('description-input');
    const tagsContainer = document.querySelector('.tags-container');
    const suggestedTags = ['男性', '30-40岁', '黑色上衣', '背包', '戴眼镜', '戴帽子', '留胡须'];
    
    // Add suggested tags
    suggestedTags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            ${tag}
            <i class="fas fa-plus"></i>
        `;
        
        tagElement.addEventListener('click', () => {
            addTagToDescription(tag);
        });
        
        tagsContainer.appendChild(tagElement);
    });
    
    function addTagToDescription(tag) {
        const currentText = descriptionInput.value;
        if (currentText.includes(tag)) {
            showNotification('该特征已添加', 'info');
            return;
        }
        
        descriptionInput.value = currentText ? `${currentText}, ${tag}` : tag;
        showNotification(`已添加特征: ${tag}`, 'success');
    }
}

// Load mock results
function loadMockResults() {
    const resultsData = [
        {
            id: 1,
            date: new Date(2023, 5, 15, 9, 30),
            location: '北区商场入口',
            videoSrc: 'video1.mp4',
            thumbnailSrc: '../images/result1.jpg',
            confidence: 92
        },
        {
            id: 2,
            date: new Date(2023, 5, 15, 10, 15),
            location: '东区公园监控点3',
            videoSrc: 'video2.mp4',
            thumbnailSrc: '../images/result2.jpg',
            confidence: 87
        },
        {
            id: 3,
            date: new Date(2023, 5, 15, 11, 45),
            location: '西区停车场B2层',
            videoSrc: 'video3.mp4',
            thumbnailSrc: '../images/result3.jpg',
            confidence: 78
        }
    ];
    
    const timelineContainer = document.querySelector('.timeline');
    
    resultsData.forEach(result => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.innerHTML = `
            <div class="timeline-date">${formatTime(result.date)}</div>
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="video-container">
                    <img src="${result.thumbnailSrc}" alt="视频缩略图">
                    <div class="video-overlay">
                        <div class="play-button">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                </div>
                <div class="timeline-details">
                    <div class="location">
                        <i class="fas fa-map-marker-alt"></i> ${result.location}
                    </div>
                    <div class="timestamp">
                        <i class="fas fa-clock"></i> ${formatDate(result.date)}
                    </div>
                </div>
                <div class="confidence-meter">
                    <div class="confidence-level" style="width: ${result.confidence}%"></div>
                </div>
                <div class="confidence-text">置信度: ${result.confidence}%</div>
            </div>
        `;
        
        timelineContainer.appendChild(timelineItem);
        
        // Add click event to play video
        const playButton = timelineItem.querySelector('.play-button');
        playButton.addEventListener('click', () => {
            showVideoModal(result);
        });
    });
}

// Show video modal
function showVideoModal(result) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
        <div class="video-modal-content">
            <div class="video-modal-header">
                <h3>目标检测结果</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="video-modal-body">
                <div class="video-player">
                    <img src="${result.thumbnailSrc}" alt="视频播放">
                </div>
                <div class="video-info">
                    <p><strong>位置:</strong> ${result.location}</p>
                    <p><strong>时间:</strong> ${formatDate(result.date)}</p>
                    <p><strong>置信度:</strong> ${result.confidence}%</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Close button event
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
} 