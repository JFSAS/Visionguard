# ai服务器的api使用说明

只支持点对点服务，使用ssh连接
```bash
cd apitest
ssh -L 65432:localhost:42073 -p 42073 root@connect.westc.gpuhub.com
输入密码
cd /root/autodl-tmp
uvicorn api:app --port 42073
```

## embed
示例:

[embed.py](embed.py)

```python
import requests
import cv2

man1 = cv2.imread(r'imgs/woman.png')
man2 = cv2.imread(r'imgs/man2.png')

url = "http://127.0.0.1:65432/embed"

data = {
    "img_list": [man1, man2],    
    "task": "body"   # 可选['face', 'body', 'caption']
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

# result: [id1, id2, ...]


```


## search_by_caption

示例:

[sbc.py](sbc.py)

```python
import requests

url = "http://127.0.0.1:65432/search_by_caption"

data = {
    "caption": 'The man in the red undershirt and blue shorts.',
    'top_k': 1, # 返回余弦相似度top_k个结果
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

# result:
# [
#  (int(id1), float(cosine)),
#  (int(id2), float(cosine)),
#  (int(id3), float(cosine)),
#  ...]
```


## 设置vg目标

示例:

[set_vg.py](set_vg.py)

```python
import requests

url = "http://127.0.0.1:65432/set_vg_target"

data = {
    "expression": "The woman in purple."
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

# result: The woman in purple.

```

## 保存向量数据库

示例:

[save_db.py](save_db.py)

```python
import requests

url = "http://127.0.0.1:65432/save_db"

data = {
    "key": "value"
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=data, headers=headers)

```

## 使用hawk

示例:

[hawk.py](hawk.py)

```python
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

result = response.json()

# result:
# {
#   'message': 'Video processed successfully', 
#   'answer': 'driving too fast on the curvy road and losing control, resulting in a head-on collision with the oncoming car in the next lane. \nNo description provided.', 
#   'video_path': '/root/autodl-tmp/uploaded_videos/car.mp4'
# }
```
## 后端接受数据格式


```python
[
  {
    "timestamp": 40.0,
    "camera_id": "1",
    "is_open": True,
    "body_xyxy": [
      [
        646.9244995117188,
        540.9838256835938,
        705.0575561523438,
        665.8565063476562
      ],
      [
        748.7825927734375,
        413.8572998046875,
        788.5052490234375,
        503.625732421875
      ],
      [
        595.1685791015625,
        240.245849609375,
        616.4808349609375,
        281.9901123046875
      ],
      [
        546.003662109375,
        379.8111572265625,
        583.474853515625,
        458.5296630859375
      ],
      [
        734.0953979492188,
        629.7276611328125,
        810.2352905273438,
        717.8258056640625
      ],
      [
        722.4127807617188,
        294.84716796875,
        744.9657592773438,
        351.0435791015625
      ]
    ],
    "face_xyxy": [],
    "body_conf": [
      0.8584823608398438,
      0.7451871037483215,
      0.7185600399971008,
      0.6571627259254456,
      0.6481828093528748,
      0.6058181524276733
    ],
    "face_conf": [],
    "body_id": [
      126163012,
      126153157,
      125509743,
      126064073,
      126174416,
      126337889
    ],
    "face_id": []
  },
  {
    "timestamp": 0.0,
    "camera_id": "2",
    "is_open": true,
    "body_xyxy": [
      [
        1390.888916015625,
        408.57861328125,
        1549.40185546875,
        960.7291259765625
      ],
      [
        1242.2296142578125,
        420.1446533203125,
        1440.5167236328125,
        1011.9702758789062
      ],
      [
        966.9715576171875,
        448.17462158203125,
        1085.2745361328125,
        679.904296875
      ],
      [
        703.35888671875,
        429.5607604980469,
        772.464599609375,
        702.12841796875
      ],
      [
        1471.8006591796875,
        369.0367126464844,
        1701.9927978515625,
        1072.5291748046875
      ],
      [
        219.8730926513672,
        476.8305358886719,
        326.7168273925781,
        705.1712646484375
      ],
      [
        863.9000244140625,
        408.46307373046875,
        956.704833984375,
        727.0541381835938
      ],
      [
        1673.244873046875,
        414.513427734375,
        1918.115478515625,
        897.6917724609375
      ]
    ],
    "face_xyxy": [
      [
        1376.263671875,
        439.2973937988281,
        1418.0343017578125,
        510.5018005371094
      ],
      [
        863.4183349609375,
        463.3208312988281,
        882.99365234375,
        489.6502990722656
      ],
      [
        740.2081298828125,
        442.0755615234375,
        758.5603637695312,
        466.727783203125
      ]
    ],
    "body_conf": [
      0.8589270710945129,
      0.8351367712020874,
      0.8208834528923035,
      0.8151670098304749,
      0.7875915765762329,
      0.7727412581443787,
      0.7359939813613892,
      0.6609454154968262
    ],
    "face_conf": [
      0.35014066100120544,
      0.3119288384914398,
      0.2638111412525177
    ],
    "body_id": [
      123703395,
      122883753,
      123451343,
      123333721,
      123918864,
      123775869,
      123591513,
      122894347
    ],
    "face_id": [
      123222565,
      123732356,
      122852667
    ]
  }
]

```