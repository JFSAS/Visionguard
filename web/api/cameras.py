import traceback
from urllib import response
from flask import Blueprint, jsonify, request
import requests
cameras_bp = Blueprint('cameras', __name__)


host_ip = '182.92.187.31'

@cameras_bp.route('/', methods=['GET'])
def get_cameras():
    try:
        response  = requests.get(f'http://{host_ip}/stat.json')
        data = response.json()
        cameras = []
        #服务器信息 
        servers = data.get('http-flv', {}).get('servers', {})
        if not servers:
            print('获取摄像头列表失败: 服务器信息不存在', f'http://{host_ip}/stat.json')
            return [], 500
        for server in servers:
            #应用信息
            applications = server.get('applications')
            #创建应用名称到应用的映射
            app_map = {app["name"] : app for app in applications}

            #查找rewdata应用和processecd应用
            rawdata_app = app_map.get("rawdata", {})
            processed_app = app_map.get('processed', {})
            
            #处理rawdata中的流
            raw_streams = rawdata_app.get("live", {}).get('streams', [])
            
            for stream in raw_streams:
                stream_name = stream.get('name')
                if not stream_name:
                    continue

                #检查流是否有发布者 
                is_active = stream.get('publishing', False) and stream.get('active', False)
                if not is_active:
                    continue
                
                # resolution
                width = stream.get('meta', {}).get('video', {}).get('width', {})
                height = stream.get('meta', {}).get('video', {}).get('height', {})
                camera_info = {
                    'id': stream_name,
                    'rawdata_url': f'http://{host_ip}/live?app=rawdata&stream={stream_name}',
                    'processed_url': f'http://{host_ip}/live?app=processed&stream={stream_name}',
                    'width': width,
                    'height': height,
                    'fps': stream.get('meta', {}).get('video', {}).get('frame_rate', {}),
                }

                #检查对应的处理后的流
                processed_stream = processed_app.get('live', {}).get("streams",[])
                has_processed = any(ps['name'] == stream_name for ps in processed_stream) 
                camera_info['has_processed'] = has_processed

                cameras.append(camera_info)
        print(f'获取摄像头列表成功: {len(cameras)}')
        return jsonify(cameras)

    except Exception as e:     
        print(f'获取摄像头列表失败: {str(e)}')           
        print(traceback.format_exc())  # 打印完整错误堆栈
        return [], 500