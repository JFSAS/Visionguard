// Target Profile Display Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Setup file upload functionality
    setupFileUpload();
    
    // Setup description input with tags
    setupDescriptionInput();
    
    // Setup search type options
    setupSearchOptions();
    
    // Setup search button
    document.getElementById('search-btn').addEventListener('click', function() {
        const searchBtn = this;
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 搜索中...';
        
        // Get current search type
        const searchTypeElement = document.querySelector('.option-btn.active');
        const searchTypeId = searchTypeElement.id;
        let searchType;
        
        if (searchTypeId === 'search-face-btn') {
            searchType = 'face';
        } else if (searchTypeId === 'search-pedestrian-btn') {
            searchType = 'pedestrian';
        } else if (searchTypeId === 'search-nlp-btn') {
            searchType = 'nlp';
        }
        
        // Simulate search delay
        setTimeout(() => {
            let message;
            if (searchType === 'face') {
                message = '人脸搜索完成，发现3处匹配结果';
            } else if (searchType === 'pedestrian') {
                message = '行人搜索完成，发现3处匹配结果';
            } else if (searchType === 'nlp') {
                message = '自然语言搜索完成，发现3处匹配结果';
            }
            
            showNotification(message, 'success');
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search"></i> 搜索目标';
            
            // 清空之前的结果
            const timelineContainer = document.querySelector('.timeline');
            timelineContainer.innerHTML = '';
            
            // 根据搜索类型加载不同的结果
            loadMockResults(searchType);
            
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
    const uploadPreview = document.querySelector('.upload-preview');
    
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
            uploadPreview.style.display = 'block';
            uploadArea.style.display = 'none';

            // Get current search type
            const searchType = document.querySelector('.option-btn.active').id === 'search-face-btn' ? 'face' : 'pedestrian';
            let message = searchType === 'face' ? '人脸图片上传成功' : '行人图片上传成功';
            showNotification(message, 'success');
        };
        reader.readAsDataURL(file);
    }
    
    // Add a reset function to allow uploading a different image
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('reset-upload')) {
            uploadPreview.style.display = 'none';
            uploadArea.style.display = 'block';
            fileInput.value = '';
        }
    });
}

// Setup description input with tags
function setupDescriptionInput() {
    const descriptionInput = document.getElementById('description-input');
    
    // The tag functionality is now handled in the setupSearchOptions function
    // This function is kept for potential future enhancements to the description input
}

// Load mock results based on search type
function loadMockResults(searchType) {
    // 根据不同的搜索类型创建不同的数据
    let resultsData;
    
    if (searchType === 'face') {
        resultsData = [
            {
                id: 1,
                date: new Date(2023, 5, 15, 9, 30),
                location: '11',
                videoSrc: 'static/videos/1-face1.mp4',
                thumbnailSrc: '../images/result1.jpg',
                confidence: 95
            },
            {
                id: 2,
                date: new Date(2023, 5, 15, 10, 15),
                location: '餐厅监控点2',
                videoSrc: 'static/videos/1-face2.mp4',
                thumbnailSrc: '../images/result2.jpg',
                confidence: 89
            },
            {
                id: 3,
                date: new Date(2023, 5, 15, 11, 45),
                location: '会议室C区入口',
                videoSrc: 'static/videos/1-face3.mp4',
                thumbnailSrc: '../images/videos/result3.jpg',
                confidence: 82
            }
        ];
    } else if (searchType === 'pedestrian') {
        resultsData = [
            {
                id: 1,
                date: new Date(2023, 5, 15, 9, 30),
                location: '停车场4',
                videoSrc: 'static/videos/6-body4.mp4',
                thumbnailSrc: '../images/result1.jpg',
                confidence: 92
            },
            {
                id: 2,
                date: new Date(2023, 5, 15, 10, 15),
                location: '停车场3',
                videoSrc: 'static/videos/5-body.mp4',
                thumbnailSrc: '../images/result2.jpg',
                confidence: 93
            },
            {
                id: 3,
                date: new Date(2023, 5, 15, 11, 45),
                location: '停车场4',
                videoSrc: 'static/videos/6-body1.mp4',
                thumbnailSrc: '../images/videos/result3.jpg',
                confidence: 94
            }
        ];
    } else if (searchType === 'nlp') {
        resultsData = [
            {
                id: 1,
                date: new Date(2023, 5, 15, 8, 45),
                location: '停车场3',
                videoSrc: 'static/videos/5-vg1.mp4',
                thumbnailSrc: '../images/result1.jpg',
                confidence: 91
            },
            {
                id: 2,
                date: new Date(2023, 5, 15, 12, 20),
                location: '停车场3',
                videoSrc: 'static/videos/5-vg3.mp4',
                thumbnailSrc: '../images/result2.jpg',
                confidence: 85
            },
            {
                id: 3,
                date: new Date(2023, 5, 15, 14, 30),
                location: '停车场4',
                videoSrc: 'static/videos/6-vg1.mp4',
                thumbnailSrc: '../images/videos/result3.jpg',
                confidence: 92      
            }
        ];
    }
    
    const timelineContainer = document.querySelector('.timeline');
    
    resultsData.forEach(result => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.innerHTML = `
            <div class="timeline-date">${formatTime(result.date)}</div>
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                <div class="video-container">
                    <video muted loop>
                        <source src="${result.videoSrc}" type="video/mp4">
                    </video>
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
        const video = timelineItem.querySelector('video');
        
        // Initialize video with a paused state
        video.pause();
        
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (video.paused) {
                video.play();
                playButton.querySelector('i').className = 'fas fa-pause';
            } else {
                video.pause();
                playButton.querySelector('i').className = 'fas fa-play';
            }
        });
        
        // Also add click to show video modal
        timelineItem.querySelector('.video-container').addEventListener('click', () => {
            showVideoModal(result);
        });
    });
}

// Show video modal
function showVideoModal(result) {
    // 创建模态窗口
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
        <div class="video-modal-content">
            <button class="close-modal"><i class="fas fa-times"></i></button>
            <div class="video-modal-header">
                <h3>监控录像详情</h3>
            </div>
            <div class="video-full-container">
                <video controls autoplay>
                    <source src="${result.videoSrc}" type="video/mp4">
                </video>
            </div>
            <div class="video-details">
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-map-marker-alt"></i> 位置：</span>
                    <span class="detail-value">${result.location}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-clock"></i> 时间：</span>
                    <span class="detail-value">${formatDate(result.date)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label"><i class="fas fa-check-circle"></i> 置信度：</span>
                    <span class="detail-value">${result.confidence}%</span>
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
        // Ensure video stops playing when modal is closed
        const modalVideo = modal.querySelector('video');
        if (modalVideo) modalVideo.pause();
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            // Ensure video stops playing when modal is closed
            const modalVideo = modal.querySelector('video');
            if (modalVideo) modalVideo.pause();
            
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    });
}

// Setup search type options
function setupSearchOptions() {
    const btns = document.querySelectorAll('.option-btn');
    const tagsContainer = document.querySelector('.tags-container');
    
    
    // Define tag sets for different search modes
    const faceTags = ['男性', '女性', '20-30岁', '30-40岁', '戴眼镜', '戴帽子', '留胡须'];
    const pedestrianTags = ['男性', '女性', '黑色上衣', '蓝色裤子', '背包', '短袖', '牛仔裤'];
    
    // Function to update tags based on mode
    function updateTags(tags) {
        tagsContainer.innerHTML = '';
        tags.forEach(tag => {
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
    }
    
    // Initialize with face tags
    updateTags(faceTags);
    
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            searchButActive(btn);
            updateTags(btn.id === 'search-face-btn' ? faceTags : pedestrianTags);
            
            // 显示/隐藏相应的输入区域
            const nlpSection = document.querySelector('.nlp-section');
            const tagsSection = document.querySelector('.tags-section');
            
            if (btn.id === 'search-nlp-btn') {
                tagsSection.style.display = 'none';
                nlpSection.style.display = 'block';
            } else {
                tagsSection.style.display = 'block';
                nlpSection.style.display = 'none';
            }
            
            showNotification('已切换到' + btn.id.split('-')[1] + '搜索模式', 'info');
        });
    });

    
    // Add tag to description function (moved from setupDescriptionInput)
    function addTagToDescription(tag) {
        const descriptionInput = document.getElementById('description-input');
        const currentText = descriptionInput.value;
        if (currentText.includes(tag)) {
            showNotification('该特征已添加', 'info');
            return;
        }
        
        descriptionInput.value = currentText ? `${currentText}, ${tag}` : tag;
        showNotification(`已添加特征: ${tag}`, 'success');
    }
} 

function searchButActive(element){
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
}