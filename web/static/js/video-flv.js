// 创建并播放FLV视频
function playFlvVideo(videoUrl, vElement, options = {}) {
    if (!vElement || !flvjs.isSupported()) {
        console.error('Video element not found or FLV.js not supported');
        return null;
    }

    // 确保视频元素有唯一ID
    if (!vElement.id) {
        vElement.id = 'video-' + Math.random().toString(36).substr(2, 9);
    }

    // 播放器唯一ID
    const playerId = vElement.id + '-player';

    // 清理已存在的播放器
    cleanupFlvPlayer(vElement);

    // 默认配置
    const defaultConfig = {
        type: 'flv',
        url: videoUrl,
        isLive: true,
        hasAudio: false,  // 禁用音频
        hasVideo: true,
        enableWorker: true,
        stashInitialSize: 128,
        enableStashBuffer: false,
        lazyLoadMaxDuration: 3,
        lazyLoad: false,
        seekType: 'range',
    };

    // 合并用户配置
    const config = { ...defaultConfig, ...options };

    try {
        // 创建播放器
        const flvPlayer = flvjs.createPlayer(config);
        
        // 附加到视频元素
        flvPlayer.attachMediaElement(vElement);

        flvPlayer.load();
        flvPlayer.play();

        // 保存播放器实例
        window[playerId] = flvPlayer;

        // 添加错误处理
        flvPlayer.on(flvjs.Events.ERROR, (errorType, errorDetail) => {
            console.error('FLV播放器错误:', errorType, errorDetail);
            cleanupFlvPlayer(vElement);
        });

        // 添加延迟处理
        const intervalId = setInterval(function () {
            if (!vElement.buffered.length) return;
            
            const end = vElement.buffered.end(0);
            const diff = end - vElement.currentTime;
            
            if (5 <= diff && diff <= 60) {
                vElement.playbackRate = 2;
            } else if (diff > 60) {
                vElement.currentTime = end;
            } else {
                vElement.playbackRate = 1;
            }
        }, 2500);

        // 保存延时校验器
        vElement.setAttribute('data-latency-interval', intervalId);

        return flvPlayer;
    } catch (error) {
        console.error('创建FLV播放器失败:', error);
        return null;
    }
}

// 销毁FLV播放器
function flv_destroy(flvPlayer) {
    if (flvPlayer) {
        try {
            flvPlayer.pause();
            flvPlayer.unload();
            flvPlayer.detachMediaElement();
            flvPlayer.destroy();
        } catch (error) {
            console.error('销毁播放器失败:', error);
        }
    }
}

// 清理FLV播放器
function cleanupFlvPlayer(videoElement) {
    if (!videoElement) {
        console.error('Video element not found');
        return;
    }

    const playerId = videoElement.id + '-player';
    
    // 清理播放器实例
    if (window[playerId]) {
        flv_destroy(window[playerId]);
        delete window[playerId];
    }

    // 清理延时矫正器
    const intervalId = videoElement.getAttribute('data-latency-interval');
    if (intervalId) {
        clearInterval(parseInt(intervalId));
        videoElement.removeAttribute('data-latency-interval');
    }
}

// 重新加载视频流
function reloadFlvVideo(videoElement, videoUrl, options = {}) {
    if (!videoElement || !videoUrl) {
        console.error('Invalid video element or URL');
        return null;
    }

    cleanupFlvPlayer(videoElement);
    return playFlvVideo(videoUrl, videoElement, options);
}