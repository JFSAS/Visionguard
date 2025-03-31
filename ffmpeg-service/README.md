# 创建必要目录
mkdir -p /opt/ffmpeg-stream/videos

# 复制脚本和配置文件
cp ffmpeg-stream.sh /opt/ffmpeg-stream/
cp ffmpeg-stream.conf /opt/ffmpeg-stream/

# 设置执行权限
chmod +x /opt/ffmpeg-stream/ffmpeg-stream.sh

# 安装systemd服务
cp ffmpeg-stream.service /etc/systemd/system/

# 重新加载systemd
systemctl daemon-reload

# 启用并启动服务
systemctl enable ffmpeg-stream.service
systemctl start ffmpeg-stream.service