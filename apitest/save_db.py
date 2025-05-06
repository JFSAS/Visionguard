import requests
import json

url = "http://127.0.0.1:65432/save_db"

# 定义要发送的数据（假设是一个 JSON 对象）
data = {
    "key": "value"
}

# 将数据转换为 JSON 格式
headers = {'Content-Type': 'application/json'}
response = requests.post(url, data=json.dumps(data), headers=headers)
