import traceback
from urllib import response
from flask import Blueprint, jsonify, request
import requests
import urllib3

# 禁用 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

cameras_bp = Blueprint('cameras', __name__)


host_ip = '182.92.187.31'

# 定义多个可能的API端点，按优先级排序
API_ENDPOINTS = [
    {'url': f'http://{host_ip}/stat.json', 'protocol': 'http', 'port': 80},
     {'url': f'https://{host_ip}/stat.json', 'protocol': 'https', 'port': 443},
    {'url': f'http://{host_ip}:8081/stat.json', 'protocol': 'http', 'port': 8081},
    {'url': f'http://{host_ip}:8082/stat.json', 'protocol': 'http', 'port': 8082},
   
]

@cameras_bp.route('/', methods=['GET'])
def get_cameras():
    all_errors = []
    
    # 尝试所有可能的API端点
    for endpoint in API_ENDPOINTS:
        try:
            # 使用verify=False禁用SSL验证，以处理自签名证书
            response = requests.get(endpoint['url'], verify=False, timeout=5)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    protocol = endpoint['protocol']
                    port = endpoint['port']
                    
                    cameras = process_camera_data(data, protocol, port)
                    if cameras:
                        print(f'获取摄像头列表成功: {len(cameras)} 个摄像头，来源: {endpoint["url"]}')
                        return jsonify(cameras)
                    else:
                        all_errors.append(f"未找到有效摄像头数据 ({endpoint['url']})")
                        continue  # 尝试下一个端点
                        
                except ValueError as json_error:
                    all_errors.append(f"JSON解析错误 ({endpoint['url']}): {str(json_error)}")
                    continue  # 尝试下一个端点
            else:
                all_errors.append(f"HTTP状态码错误 ({endpoint['url']}): {response.status_code}")
                continue  # 尝试下一个端点
                
        except requests.RequestException as e:
            all_errors.append(f"请求错误 ({endpoint['url']}): {str(e)}")
            continue  # 尝试下一个端点
    
    # 所有端点都失败，返回错误
    error_message = "\n".join(all_errors)
    print(f'获取摄像头列表失败，所有端点都无法连接:\n{error_message}')
    print(traceback.format_exc())  # 打印完整错误堆栈
    return jsonify([]), 500

def process_camera_data(data, protocol, port):
    """处理从API获取的摄像头数据"""
    try:
        cameras = []
        
        # 获取服务器信息
        servers = data.get('http-flv', {}).get('servers', {})
        if not servers:
            print('获取摄像头列表失败: 服务器信息不存在')
            return []
            
        for server in servers:
            # 应用信息
            applications = server.get('applications')
            if not applications:
                continue
                
            # 创建应用名称到应用的映射
            app_map = {app["name"] : app for app in applications}

            # 查找rawdata应用和processed应用
            rawdata_app = app_map.get("rawdata", {})
            processed_app = app_map.get('processed', {})
            
            # 处理rawdata中的流
            raw_streams = rawdata_app.get("live", {}).get('streams', [])
            
            for stream in raw_streams:
                stream_name = stream.get('name')
                if not stream_name:
                    continue

                # 检查流是否有发布者
                is_active = stream.get('publishing', False) and stream.get('active', False)
                if not is_active:
                    continue
                
                # 分辨率
                width = stream.get('meta', {}).get('video', {}).get('width', 0)
                height = stream.get('meta', {}).get('video', {}).get('height', 0)
                
                # 为不同端口创建URL
                base_url = f"{protocol}://{host_ip}"
                if port != 80 and protocol == 'http':
                    base_url = f"{protocol}://{host_ip}:{port}"
                elif port != 443 and protocol == 'https':
                    base_url = f"{protocol}://{host_ip}:{port}"
                
                # 创建流URL
                stream_url = f'{base_url}/live?app=rawdata&stream={stream_name}'
                processed_url = f'{base_url}/live?app=processed&stream={stream_name}'
                
                # 构建摄像头信息
                camera_info = {
                    'id': stream_name,
                    'camera_name': f'摄像头 {stream_name}',
                    'description': f'分辨率: {width}x{height}',
                    'location': '未知位置',
                    'is_active': True,
                    'is_favorite': False,
                    'rawdata_url': stream_url,
                    'processed_url': processed_url,
                    'stream_url': stream_url,  # 默认使用rawdata URL
                    'width': width,
                    'height': height,
                    'fps': stream.get('meta', {}).get('video', {}).get('frame_rate', 0),
                }

                # 检查对应的处理后的流
                processed_streams = processed_app.get('live', {}).get("streams", [])
                has_processed = any(ps.get('name') == stream_name for ps in processed_streams) 
                camera_info['has_processed'] = has_processed

                cameras.append(camera_info)
                
        return cameras
    except Exception as e:
        print(f"处理摄像头数据时出错: {str(e)}")
        print(traceback.format_exc())
        return []