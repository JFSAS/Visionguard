

# 城市态势感知系统

这是一个基于HTML、CSS和JavaScript的静态前端页面，用于展示城市态势感知系统的三个主要功能模块。

# 前端

## 功能模块

### 1. 城市态势感知区

- 热力图显示可疑目标分布
- 实时预警信息浮窗
- 重点区域监控画中画

### 2. 目标画像展示区

- 头像上传模块
- 语言描述输入
- 结果展示模块（出现目标的片段重放，标注时间线）

### 3. 智能分析报告区

- 自动生成的当日安全简报
- 案件线索关联图谱
- 系统置信度可视化

## 技术栈

- HTML5
- CSS3
- JavaScript (ES6+)
- Font Awesome 图标库

## 文件结构

```
├── index.html          # 城市态势感知页面
├── profile.html        # 目标画像展示页面
├── analysis.html       # 智能分析报告页面
├── css/
│   ├── style.css       # 全局样式
│   ├── situation.css   # 态势感知页面样式
│   ├── profile.css     # 目标画像页面样式
│   └── analysis.css    # 分析报告页面样式
├── js/
│   ├── common.js       # 公共JavaScript函数
│   ├── situation.js    # 态势感知页面脚本
│   ├── profile.js      # 目标画像页面脚本
│   └── analysis.js     # 分析报告页面脚本
└── images/             # 图片资源目录
```

## 使用说明

1. 直接在浏览器中打开 `index.html` 文件即可访问系统
2. 通过顶部导航栏切换不同功能模块
3. 各模块均包含模拟数据，可以体验完整功能

## 注意事项

- 这是一个纯前端静态演示系统，所有数据均为模拟数据
- 系统中的图表和可视化效果使用原生JavaScript实现
- 为获得最佳体验，建议使用现代浏览器（Chrome、Firefox、Edge等）访问 

# 算法

摄像头  ->  视频流（{ "frame" : }）  ->  

id  feature  date  camera  
12   vetor   123    123

# Nginx监控配置指南

## 启用Nginx状态监控模块

1. 编辑Nginx配置文件：

```bash
sudo vim /etc/nginx/nginx.conf
```

2. 在http或server块中添加以下配置：

```nginx
server {
    listen 8080;
    server_name localhost;
    
    # 访问控制，限制只有特定IP可以访问
    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;    # 允许本地访问
        allow 10.0.0.0/8;   # 允许内网访问
        deny all;           # 拒绝其他所有访问
    }
}
```

3. 验证配置并重启Nginx：

```bash
sudo nginx -t
sudo systemctl restart nginx
```

4. 访问状态页面：

```bash
curl http://localhost:8080/nginx_status
```

状态页面将显示以下信息：
- Active connections: 当前活动连接数
- accepts: 已接受的连接总数
- handled: 已处理的连接总数
- requests: 请求总数
- Reading: 正在读取请求头的连接数
- Writing: 正在写响应的连接数
- Waiting: 等待请求的空闲连接数
```

## 使用阿里云的监控工具

阿里云提供了多种工具来监控Nginx服务器：

### 1. 阿里云云监控(CloudMonitor)

CloudMonitor支持对Nginx的监控，设置方法：

1. 登录阿里云控制台，前往云监控服务
2. 安装云监控插件（如未安装）：

```bash
# 安装阿里云监控插件
wget http://update2.aegis.aliyun.com/download/install_agent.sh
chmod +x install_agent.sh
./install_agent.sh
```

3. 在云监控中配置Nginx监控：
   - 进入应用分组
   - 创建Nginx监控
   - 配置监控项和报警规则

### 2. Prometheus + Grafana

这是一个功能强大的开源监控组合：

1. 安装Prometheus：

```bash
# 下载Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.41.0/prometheus-2.41.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# 运行Prometheus
./prometheus --config.file=prometheus.yml
```

2. 安装Nginx Prometheus Exporter：

```bash
# 下载Nginx Prometheus Exporter
wget https://github.com/nginxinc/nginx-prometheus-exporter/releases/download/v0.10.0/nginx-prometheus-exporter_0.10.0_linux_amd64.tar.gz
tar xvfz nginx-prometheus-exporter_*.tar.gz
cd nginx-prometheus-exporter_*

# 运行exporter
./nginx-prometheus-exporter -nginx.scrape-uri=http://localhost:8080/nginx_status
```

3. 安装Grafana：

```bash
# 添加Grafana仓库
sudo apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"

# 安装Grafana
sudo apt-get update
sudo apt-get install grafana

# 启动Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

4. 在Grafana中配置Prometheus数据源并导入Nginx仪表盘(ID: 11199)

### 3. 其他监控工具

- **Zabbix**: 企业级监控解决方案，支持自动发现和报警
- **Nagios**: 强大的IT基础设施监控工具
- **Datadog**: SaaS监控平台，提供全面的Nginx监控
- **New Relic**: 应用性能监控工具，可监控Nginx

## 推荐做法

综合考虑易用性和功能性，推荐使用阿里云云监控 + Prometheus/Grafana组合：
- 云监控：提供基本监控和报警功能，与阿里云生态紧密集成
- Prometheus/Grafana：提供更详细的指标和可视化能力

对于生产环境，建议同时启用多种监控方式，以确保监控的全面性和可靠性。



