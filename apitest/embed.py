import cv2
import time
import requests

video_path = r'MOTS/MOTS20-11.mp4'

target_path = r'imgs/man2.png'
face_path = r'imgs/face.png'
man1 = cv2.imread(r'imgs/woman.png')
man2 = cv2.imread(r'imgs/man2.png')
face = cv2.imread(face_path)

cap = cv2.VideoCapture(video_path)

man1 = cv2.cvtColor(man1, cv2.COLOR_BGR2RGB).tolist()
man2 = cv2.cvtColor(man2, cv2.COLOR_BGR2RGB).tolist()
face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB).tolist()

while True:
    t1 = time.time()
    data = {
        "img_list": [man1, man2],
        "task": 'body'   # 可选['face', 'body', 'caption']
    }

    # 设置请求头
    headers = {
        "Content-Type": "application/json"
    }

    # 发送 POST 请求
    url = "http://127.0.0.1:65432/embed"
    response = requests.post(url, json=data, headers=headers)

    print("Response Status Code:", response.status_code)
    print("Response Content:", response.json())

    elapsed_time = time.time() - t1

    print(f"\033[91m{elapsed_time}\033[0m")
    exit(0)