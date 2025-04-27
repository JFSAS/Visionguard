// 创建并播放FLV视频, 兼容原始创建flv方法
function playFlvVideo(videoUrl, vElement, options = {}) {
  if (!vElement || !flvjs.isSupported()) {
    console.error("Video element not found or FLV.js not supported");
    return null;
  }

  // 确保视频元素有唯一ID
  if (!vElement.id) {
    vElement.id = "video-" + Math.random().toString(36).substr(2, 9);
  }

  // 播放器唯一ID
  const playerId = vElement.id + "-player";

  // 清理已存在的播放器
  cleanupFlvPlayer(vElement);

  // 默认配置
  const defaultConfig = {
    type: "flv",
    url: videoUrl,
    isLive: true,
    hasAudio: false, // 禁用音频
    hasVideo: true,
    enableWorker: true,
    stashInitialSize: 128,
    enableStashBuffer: false,
    lazyLoadMaxDuration: 3,
    lazyLoad: false,
    seekType: "range",
  };

  // 合并用户配置
  const config = { ...defaultConfig, ...options };

  try {
    // 创建播放器
    const flvPlayer = flvjs.createPlayer(config);

    // 附加到视频元素
    flvPlayer.attachMediaElement(vElement);

    // 设置视频为静音，解决自动播放策略问题
    vElement.muted = true;

    flvPlayer.load();
    flvPlayer.play();

    // 保存播放器实例
    window[playerId] = flvPlayer;

    // 添加错误处理
    flvPlayer.on(flvjs.Events.ERROR, (errorType, errorDetail) => {
      console.error("FLV播放器错误:", errorType, errorDetail);
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
    vElement.setAttribute("data-latency-interval", intervalId);

    return flvPlayer;
  } catch (error) {
    console.error("创建FLV播放器失败:", error);
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
      console.error("销毁播放器失败:", error);
    }
  }
}

// 清理FLV播放器
function cleanupFlvPlayer(videoElement) {
  if (!videoElement) {
    console.error("Video element not found");
    return;
  }

  const playerId = videoElement.id + "-player";

  // 清理播放器实例
  if (window[playerId]) {
    flv_destroy(window[playerId]);
    delete window[playerId];
  }

  // 清理延时矫正器
  const intervalId = videoElement.getAttribute("data-latency-interval");
  if (intervalId) {
    clearInterval(parseInt(intervalId));
    videoElement.removeAttribute("data-latency-interval");
  }
}

// 重新加载视频流
function reloadFlvVideo(videoElement, videoUrl, options = {}) {
  if (!videoElement || !videoUrl) {
    console.error("Invalid video element or URL");
    return null;
  }

  cleanupFlvPlayer(videoElement);
  return playFlvVideo(videoUrl, videoElement, options);
}

/**
 * FlvVideoRenderer类
 * 用于播放原始FLV视频或使用Canvas渲染带有目标检测框的视频
 */
class FlvVideoRenderer {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      maxBinaryLength: 32, // 二进制编码最大长度
      blocksPerRow: 8, // 每行块数
      delaySeconds: 2, // 渲染延迟时间(秒)
      renderingEnabled: true, // 是否开启渲染
      decodingInterval: 1, // 解码间隔(每N帧解码一次)
      debugMode: false, // 调试模式
      showFrameNumber: true, // 是否显示帧序号
      frameNumberPosition: {
        // 帧序号显示位置
        x: 10,
        y: 30,
      },
      frameNumberStyle: {
        // 帧序号样式
        font: "24px Arial",
        color: "red",
      },
      ...options,
    };

    // 初始化属性
    this.sourcePlayer = null; // 原始FLV播放器
    this.sourceVideo = null; // 原始视频元素
    this.displayCanvas = null; // 显示Canvas
    this.ctx = null; // Canvas上下文
    this.frameCount = 0; // 处理的帧数
    this.isRendering = false; // 是否正在渲染
    this.frameBuffer = []; // 帧缓冲区
    this.animationFrameId = null; // requestAnimationFrame ID
    this.currentFrameNumber = -1; // 当前帧序号
    this.isPaused = false; // 是否暂停播放
    this.frameDataCache = {}; // 存储帧检测数据的缓存
    this.lastRequestedFrame = -1; // 上次请求的帧号
    this.requestInProgress = false; // 是否有请求正在进行中
    this.batchSize = 30; // 每次请求的帧数量
    this.cameraId = null; // 摄像头ID
    this.preloadThreshold = 15; // 当剩余未渲染的缓存帧少于此值时预加载

  }

  /**
   * 创建原始FLV播放器(无渲染处理)
   * @param {string} videoUrl - 视频URL
   * @param {HTMLElement} container - 容器元素
   * @param {Object} playerOptions - FLV播放器选项
   * @returns {Object} FLV播放器实例
   */
  createOriginalVideo(videoUrl, container, playerOptions = {}) {
    // 创建视频元素
    const videoElement = document.createElement("video");
    videoElement.style.width = "100%";
    videoElement.style.height = "100%";
    videoElement.controls = true;

    // 清空容器并添加视频元素
    container.innerHTML = "";
    container.appendChild(videoElement);

    // 播放FLV视频
    const player = playFlvVideo(videoUrl, videoElement, playerOptions);
    return player;
  }

  /**
   * 创建带渲染处理的FLV播放器
   * @param {string} videoUrl - 视频URL
   * @param {HTMLElement} container - 容器元素
   * @param {Object} playerOptions - FLV播放器选项
   * @returns {Object} 包含播放器和控制接口的对象
   */
  createRenderedVideo(videoUrl, container, playerOptions = {}) {
    // 创建源视频元素(隐藏)
    this.sourceVideo = document.createElement("video");
    this.sourceVideo.style.display = "none";

    // 创建显示Canvas
    this.displayCanvas = document.createElement("canvas");
    this.displayCanvas.style.width = "100%";
    this.displayCanvas.style.height = "100%";

    // 清空容器并添加元素
    container.innerHTML = "";
    container.appendChild(this.displayCanvas);
    document.body.appendChild(this.sourceVideo);

    // 获取Canvas上下文
    this.ctx = this.displayCanvas.getContext("2d");

    // 播放源视频
    this.sourcePlayer = playFlvVideo(videoUrl, this.sourceVideo, playerOptions);

    // 设置事件监听
    this.sourceVideo.addEventListener(
      "playing",
      this._onVideoPlaying.bind(this)
    );

    // 开始渲染
    this.isRendering = this.options.renderingEnabled;

    return {
      player: this.sourcePlayer,
      videoElement: this.sourceVideo,
      canvas: this.displayCanvas,
      renderer: this,
    };
  }

  //设置摄像头id
  setCameraId(cameraId) {
    this.cameraId = cameraId;
  }

  /**
   * 暂停视频播放
   */
  pausePlayback() {
    if (this.sourceVideo && !this.isPaused) {
      this.sourceVideo.pause();
      this.isPaused = true;

      if (this.options.debugMode) {
        console.log("视频播放已暂停");
      }
    }
  }

  /**
   * 恢复视频播放
   */
  resumePlayback() {
    if (this.sourceVideo && this.isPaused) {
      this.sourceVideo.play().catch((err) => {
        console.error("恢复播放失败:", err);
      });
      this.isPaused = false;

      if (this.options.debugMode) {
        console.log("视频播放已恢复");
      }
    }
  }

  /**
   * 当视频开始播放时的处理
   * @private
   */
  _onVideoPlaying() {
    // 设置Canvas尺寸
    this.displayCanvas.width = this.sourceVideo.videoWidth;
    this.displayCanvas.height = this.sourceVideo.videoHeight;

    // 开始处理帧
    if (this.isRendering) {
      this._startFrameProcessing();
    }
  }

  /**
   * 开始帧处理
   * @private
   */
  _startFrameProcessing() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this._processFrame();
  }

  /**
   * 处理视频帧
   * @private
   */
  _processFrame() {
    if (!this.sourceVideo || this.sourceVideo.ended) {
      return;
    }

    // 增加帧计数
    this.frameCount++;

    // 绘制当前帧到Canvas
    this.ctx.drawImage(this.sourceVideo, 0, 0);

    // 根据解码间隔决定是否解码帧序号
    if (this.frameCount % this.options.decodingInterval === 0) {
      this._decodeCurrentFrame();
    }
    if (this.currentFrameNumber < this.lastRequestedFrame) {
      this.lastRequestedFrame = this.currentFrameNumber;
    }

    // 检查是否需要加载更多帧数据
    this.checkFrameDataCache(this.currentFrameNumber);

    // 清理已使用的缓存数据
    if (this.currentFrameNumber !== -1) {
        // 如果当前帧号大于30，则清理缓存中小于当前帧号-30的帧数据
        if (this.currentFrameNumber > 30) {
          const oldFrames = Object.keys(this.frameDataCache)
            .map(Number)
            .filter((frame) => frame < this.currentFrameNumber - 30);

          oldFrames.forEach((frame) => {
            delete this.frameDataCache[frame];
          });
        }
      }
    
    // 显示帧序号
    if (this.options.showFrameNumber && this.currentFrameNumber !== -1) {
      this._drawFrameNumber();
    }

    // 渲染检测框
    if (this.currentFrameNumber !== -1) {
      this._renderDetectionBoxes();
    }

    // 继续处理下一帧
    this.animationFrameId = requestAnimationFrame(
      this._processFrame.bind(this)
    );
  }


  /**
   *
   * @returns {void}
   */
  checkFrameDataCache() {
    // 如果没有设置摄像头ID，则无法请求
    if (!this.cameraId) return;

    // 计算当前已请求的帧号
    const futureFramesCount = this.lastRequestedFrame - this.currentFrameNumber;

    // 如果缓存中的未来帧少于阈值，且没有正在进行的请求，则发起新请求
    if (futureFramesCount < this.preloadThreshold && !this.requestInProgress) {
      const startFrame = Math.max(this.currentFrameNumber, this.lastRequestedFrame + 1);
      this._requestFramesBatch(startFrame, this.batchSize);
    }
  }

  /**
   * 请求一批帧数据
   * @param {number} startFrame - 起始帧号
   * @param {number} count - 请求的帧数量
   * @private
   */
  _requestFramesBatch(startFrame, count) {
    if (!this.cameraId || this.requestInProgress) return;


    this.lastRequestedFrame = startFrame + count - 1;
    this.requestInProgress = true;
    console.log(
      `请求帧数据: ${this.cameraId}, 起始帧: ${startFrame}, 数量: ${count}`
    );

    // 发起HTTP请求
    fetch(`/api/detection/frames/${this.cameraId}/${startFrame}/${count}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP错误 ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success && data.frames) {
          // 更新帧缓存
          this.frameDataCache = { ...this.frameDataCache, ...data.frames };
          console.log(`请求数据成功 ：加载 ${data.actual_count} 帧检测数据, 当前已请求: ${this.lastRequestedFrame}`);
        }
      })
      .catch((error) => {
        console.error("请求帧数据失败:", error);
      })
      .finally(() => {
        console.log(`未请求到数据 ：已请求至${this.lastRequestedFrame}`);
        this.requestInProgress = false; // 请求完成，重置标志
      });
  }

  /**
   * 解码当前帧
   * @private
   */
  _decodeCurrentFrame() {
    // 获取左上角区域的图像数据用于解码
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.options.blocksPerRow,
      Math.ceil(this.options.maxBinaryLength / this.options.blocksPerRow) + 1
    );

    // 解码帧序号
    const frameNumber = this._decodeFrame(imageData);
    if (frameNumber !== null) {
      this.currentFrameNumber = frameNumber;

      if (this.options.debugMode) {
        console.log(`解码帧序号: ${frameNumber}`);
      }
    }
  }

  /**
   * 从图像数据中解码帧序号
   * @param {ImageData} imageData - 图像数据
   * @returns {number|null} 解码的帧序号，解码失败返回null
   * @private
   */
  _decodeFrame(imageData) {
    // 检查标记行
    for (let i = 0; i < this.options.blocksPerRow; i += 2) {
      const idx = i * 4; // RGBA格式
      const idx2 = (i + 1) * 4;

      if (imageData.data[idx] < 128 || imageData.data[idx2] >= 128) {
        if (this.options.debugMode) {
          console.log("无法识别标记行");
        }
        return null;
      }
    }

    // 提取帧序号
    const extractedBits = [];
    for (let i = 0; i < this.options.maxBinaryLength; i++) {
      const row = Math.floor(i / this.options.blocksPerRow) + 1;
      const col = i % this.options.blocksPerRow;
      const idx = (row * imageData.width + col) * 4;

      // 根据像素亮度判断位值
      const bit = imageData.data[idx] > 128 ? 1 : 0;
      extractedBits.push(bit);
    }

    // 将二进制转换回帧序号
    const binaryStr = extractedBits.join("");
    const frameNumber = parseInt(binaryStr, 2);

    return isNaN(frameNumber) ? null : frameNumber;
  }

  /**
   * 在Canvas上绘制帧序号
   * @private
   */
  _drawFrameNumber() {
    const pos = this.options.frameNumberPosition;
    const style = this.options.frameNumberStyle;

    this.ctx.fillStyle = style.color;
    this.ctx.font = style.font;
    this.ctx.fillText(`帧序号: ${this.currentFrameNumber}`, pos.x, pos.y);
  }

  /**
   * 渲染检测框
   * @private
   */
  _renderDetectionBoxes() {
    // 获取当前帧的检测数据
    const rawframe = this.frameDataCache[this.currentFrameNumber] || [];
    
    let persons;
    if (Array.isArray(rawframe.persons)){
      persons = rawframe.persons
    } else {
      persons = []
    }
    // 绘制每个检测框
    persons.forEach((person) => {
      // 设置样式
      const box = person.bbox;
      this.ctx.strokeStyle = box.color || "green";
      this.ctx.lineWidth = box.lineWidth || 3;

      // 绘制矩形
      this.ctx.strokeRect(box.x, box.y, box.width, box.height);

      // 绘制标签
      if (person.id !== undefined ) {
        // 设置文本背景
        const label = `ID:${person.id}`;
        const textWidth = this.ctx.measureText(label).width;

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fillRect(box.x, box.y - 25, textWidth + 10, 20);

        // 绘制文本
        this.ctx.fillStyle = box.color || "green";
        this.ctx.font = box.font || "16px Arial";
        this.ctx.fillText(label, box.x + 5, box.y - 10);

        // 如果有置信度，也显示出来
        if (person.confidence !== undefined) {
          const confText = `${Math.round(person.confidence * 100)}%`;
          this.ctx.fillText(
            confText,
            box.x + box.width - this.ctx.measureText(confText).width - 5,
            box.y - 10
          );
        }
      }
    });
  }

 

  /**
   * 切换渲染模式
   * @param {boolean} enabled - 是否启用渲染
   */
  toggleRendering(enabled) {
    this.isRendering = enabled;

    if (enabled && !this.animationFrameId) {
      this._startFrameProcessing();
    } else if (!enabled && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 设置延迟时间
   * @param {number} seconds - 延迟秒数
   */
  setDelayTime(seconds) {
    this.options.delaySeconds = seconds;
  }

  /**
   * 获取未来帧缓存区中的帧数量
   * @returns {number} 缓存帧数量
   */
  getFutureFramesCount() {
    return Object.keys(this.futureFrames).length;
  }

  /**
   * 获取播放状态
   * @returns {boolean} 是否暂停中
   */
  isPausedState() {
    return this.isPaused;
  }

  /**
   * 销毁播放器和资源
   */
  destroy() {
    // 停止渲染
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 清理播放器
    if (this.sourcePlayer) {
      cleanupFlvPlayer(this.sourceVideo);
      this.sourcePlayer = null;
    }

    // 移除元素
    if (this.sourceVideo && this.sourceVideo.parentNode) {
      this.sourceVideo.parentNode.removeChild(this.sourceVideo);
    }

    // 清空数据
    this.frameBuffer = [];
    this.futureFrames = {};
    this.currentFrameNumber = -1;
  }
}
