import requests
import os

# 设定目标 FastAPI 端点 URL
url = "http://127.0.0.1:65432/hawk"

# 视频文件路径
video_path = "imgs/car.mp4"

# 输入文本（可根据需要修改）
input_text = "What is the anomaly for the car in this video?"

# 打开视频文件并上传
with open(video_path, 'rb') as video_file:
    files = {'video': (os.path.basename(video_path), video_file, 'video/mp4')}
    data = {'input': input_text}

    response = requests.post(url, files=files, data=data)

# 输出返回的结果
print(response.status_code)
print(response.json())
