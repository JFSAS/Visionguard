#!/bin/bash

# 配置文件路径
CONFIG_FILE="/opt/ffmpeg-stream/ffmpeg-stream.conf"

# 检查配置文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo "配置文件不存在: $CONFIG_FILE"
    exit 1
fi

# 读取配置文件
source "$CONFIG_FILE"

# 启动每个流
for ((i=0; i<${#VIDEO_FILES[@]}; i++)); do
    video="${VIDEO_FILES[$i]}"
    rtmp="${RTMP_URLS[$i]}"
    
    # 检查视频文件是否存在
    if [ -f "$video" ]; then
        # 启动FFmpeg流
        ffmpeg -stream_loop -1 -re -i "$video" -c copy -f flv "$rtmp" &
    else
        echo "视频文件不存在: $video"
    fi
done

# 等待所有后台进程完成
wait