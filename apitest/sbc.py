import cv2
import time
import requests


while True:
    t1 = time.time()
    data = {
        "caption": 'The man in the red undershirt and blue shorts.',
        'top_k': 1,
    }

    # 设置请求头
    headers = {
        "Content-Type": "application/json"
    }

    # 发送 POST 请求
    url = "http://127.0.0.1:65432/search_by_caption"
    response = requests.post(url, json=data, headers=headers)

    print("Response Status Code:", response.status_code)
    print("Response Content:", response.json())

    elapsed_time = time.time() - t1

    print(f"\033[91m{elapsed_time}\033[0m")
    exit(0)