from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Form
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
from main_model import Model, load_db, save_db
from ParallelDataSender import AsyncSocketSender
import numpy as np
import os
from PIL import Image
import time
import subprocess
import shutil
import cv2
import requests
import time
from tools import *
import asyncio
import logging
from queue import Queue
import threading
import json
import concurrent.futures
from VideoFrameEncoder import VideoFrameEncoder

encoder = VideoFrameEncoder(max_binary_length=32, blocks_per_row=8)

# uvicorn api:app --port 15850
# ssh -L 65432:localhost:15850 -p 15850 root@connect.westc.gpuhub.com
# stream_model = Model(['reid', 'face_recognition', 'body_detect', 'face_detect'])
port = 42073
host = "127.0.0.1"  # 替换为你的目标IP地址
port = 12345        # 替换为你的目标端口
sender = AsyncSocketSender(host, port)

model = Model(['reid', 'face_recognition', 'caption_reid'])
stream_model = Model(['reid', 'face_recognition', 'body_detect', 'face_detect', 'ALVG'])

load_db()
app = FastAPI()
model_lock = asyncio.Lock()
frame_list = []
list_xyxy, list_conf = None, None
results = {}
expression = None
public_ip = '116.172.94.66'
base_time = None


@app.post("/base_process")
async def base_process(request: Request):
    # 获取请求体中的 JSON 数据
    data = await request.json()
    t1 = time.time()
    # 提取参数
    frames = data.get("frames")
    body_threshold: float = data.get("body_threshold", 0.6)
    face_threshold: float = data.get("face_threshold", 0.25)
    test_connect = data.get("test_connect", False)

    if test_connect is not False:
        return JSONResponse(
            status_code=200,
            content=''
        )
    frames = [np.array(frame).astype(np.uint8) for frame in frames]

    async with model_lock:

        result = model.process(frames, body_threshold, face_threshold)
        for key in result.keys():
            result[key] = [t.tolist() if isinstance(t, np.ndarray) else t for t in result[key]]

    print(time.time() - t1)
    return JSONResponse(
        status_code=200,
        content=result
    )


@app.post("/save_db")
async def save_db_(request: Request):
    await request.json()
    # async with model_lock:
    try:
        save_db()
        return JSONResponse(
            status_code=200,
            content='save success'
        )
    except Exception as e:
        return JSONResponse(
            status_code=200,
            content=e
        )


@app.post("/embed")
async def embed(request: Request):
    data = await request.json()
    task = data.get("task")
    assert task in ['face', 'body', 'caption']
    img_list = data.get("img_list")
    assert img_list is not None
    img_list = [np.array(img).astype(np.uint8) for img in img_list]
    async with model_lock:
        if task == 'caption':
            ids = data.get("ids", None)
            img_list = [Image.fromarray(img) for img in img_list]
            ids = model.v_embed_and_get_ids(img_list, ids)
        else:
            ids = model.embed_and_get_ids(img_list, task)
    return JSONResponse(
        status_code=200,
        content=ids
    )


@app.post("/search_by_caption")
async def search_by_caption(request: Request):
    data = await request.json()
    caption = data.get("caption")
    top_k = data.get("top_k", 1)
    assert isinstance(caption, str)
    # async with model_lock:
    id_and_cosine = model.search_by_caption(caption, top_k)
    ids = [(int(id), float(cosine)) for id, cosine in id_and_cosine]
    return JSONResponse(
        status_code=200,
        content=ids
    )


@app.post("/set_vg_target")
async def set_vg_target(request: Request):
    global expression
    data = await request.json()
    expression = data.get("expression")

    assert isinstance(expression, str)

    return JSONResponse(
        status_code=200,
        content=expression
    )


UPLOAD_DIR = "/root/autodl-tmp/uploaded_videos"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/hawk")
async def hawk(video: UploadFile = File(...), input: str = Form("What happened in this video?")):
    # 定义视频存储路径
    video_path = os.path.join(UPLOAD_DIR, video.filename)

    # 将上传的视频文件存储到本地
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # 处理视频并生成聊天回答
    answer = process_video_and_chat(video_path, input)

    return JSONResponse(
        status_code=200,
        content={"message": "Video processed successfully", "answer": answer, "video_path": video_path}
    )

@app.post("/alvg")
async def alvg(request: Request):
    global list_xyxy, list_conf
    data = await request.json()
    t1 = time.time()
    list_xyxy, list_conf = stream_model.ALVG.process(frame_list, expression)
    print(time.time() - t1)
    return JSONResponse(
        status_code=200,
        content=''
    )

@app.post("/base")
async def base(request: Request):
    global results
    data = await request.json()
    t1 = time.time()
    results = stream_model.process(frame_list)
    print(time.time() - t1)
    return JSONResponse(
        status_code=200,
        content=''
    )


async def background_task():
    await asyncio.to_thread(sync_background_task)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StreamMonitor(threading.Thread):
    def __init__(self, stream_url, max_retries=5, retry_interval=3):
        super().__init__()
        self.stream_url = stream_url
        self.max_retries = max_retries
        self.retry_interval = retry_interval
        self.cap = None
        self.frame_queue = Queue(maxsize=1000)  # 存储最新帧
        self.running = True
        self.connect()

    def connect(self):
        """尝试建立连接，支持指数退避"""
        retries = 0
        while retries < self.max_retries and self.running:
            self.cap = cv2.VideoCapture(self.stream_url)
            if self.cap.isOpened():
                logger.info(f"Connected to {self.stream_url}")
                return True
            logger.warning(f"Retrying ({retries+1}/{self.max_retries}) for {self.stream_url}")
            time.sleep(self.retry_interval * (2 ** retries))  # 指数退避
            retries += 1
        return False

    def run(self):
        """持续读取帧并监控连接状态"""
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                if not self.connect():
                    break  # 放弃重连

            ret, frame = self.cap.read()
            timestamp_ms = encoder.decode_frame(frame)
            if not ret:
                logger.error(f"Stream {self.stream_url} disconnected")
                self.cap.release()
                self.cap = None
                continue

            # 更新最新帧（覆盖旧数据）
            if self.frame_queue.full():
                self.frame_queue.get()
            self.frame_queue.put((frame, timestamp_ms))

    def stop(self):
        """安全停止线程"""
        self.running = False
        if self.cap is not None:
            self.cap.release()


def sync_background_task():
    global frame_list, list_xyxy, list_conf, results, expression, base_time
    while True:
        stream_ids = ['1', '2']
        raw_urls = [f"http://182.92.187.31//live?port=1935&app=rawdata&stream={stream_id}" for stream_id in stream_ids]
        monitors = [StreamMonitor(url) for url in raw_urls]
        camera_cnt = len(stream_ids)
        for monitor in monitors:
            monitor.start()
        process_freq = 6

        headers = {
            "Content-Type": "application/json"
        }

        def post_base():
            return requests.post(f"http://127.0.0.1:{port}/base", json={}, headers=headers)

        def post_alvg():
            return requests.post(f"http://127.0.0.1:{port}/alvg", json={}, headers=headers)


        backend_url = "http://127.0.0.1:65432/receive_data"

        resolution_list = [
            '1280x720',
            '1920x1080',
        ]

        rtmp_urls = [f'rtmp://182.92.187.31:1935/processed/{stream_id}' for stream_id in stream_ids]

        commands = \
            [
                f"ffmpeg -y -f rawvideo -vcodec rawvideo -pix_fmt bgr24 -s {resolution} -r 25.0 -i - -c:v libx264 -pix_fmt yuv420p -preset ultrafast -f flv {rtmp_url}"
                for resolution, rtmp_url in zip(resolution_list, rtmp_urls)]

        pipes = [
            subprocess.Popen(
                command,
                stdin=subprocess.PIPE,

                shell=True
            )
            for command in commands
        ]
        cnt = 0

        while True:
            t1 = time.time()
            camera_status = []
            frame_list = []
            bgr_frame_list = []
            timestamp_list = []
            message_list = []
            results = {}
            list_xyxy, list_conf = [], []
            lsat_processed_camera_status = [True] * camera_cnt
            for monitor in monitors:
                if not monitor.frame_queue.empty():
                    frame, timestamp = monitor.frame_queue.get()
                    camera_status.append(True)
                    bgr_frame_list.append(frame)
                    frame_list.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    timestamp_list.append(timestamp)
                else:
                    camera_status.append(False)
                    timestamp_list.append(-1)

            if len(frame_list) == 1:
                pass
            if (cnt % process_freq == 0 or results == {}) and frame_list:
                lsat_processed_camera_status = camera_status.copy()
                # results = stream_model.process(frame_list)
                # if expression is not None:
                #     list_xyxy, list_conf = stream_model.ALVG.process(frame_list, expression)

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    executor.submit(post_base)
                    executor.submit(post_alvg)

            rcnt = 0
            fcnt = 0

            for i in range(camera_cnt):
                if camera_status[i] and lsat_processed_camera_status[i]:
                    try:
                        body_xyxy = results['body_xyxy'][rcnt]
                        face_xyxy = results['face_xyxy'][rcnt]
                        body_conf = results['body_conf'][rcnt]
                        face_conf = results['face_conf'][rcnt]
                        face_id = results['face_id'][rcnt]
                        body_id = results['body_id'][rcnt]

                    except Exception as e:
                        print(f"Error occurred: {e}")
                        print(rcnt, lsat_processed_camera_status, camera_status, results)
                        exit(0)
                        pass
                    processed_frame = draw_boxes(bgr_frame_list[fcnt], body_xyxy, body_id, color=(255, 0, 0), font_size=0.7)
                    processed_frame = draw_boxes(processed_frame, face_xyxy, face_id, color=(0, 255, 0), font_size=0.7)

                    message_list.append({
                        'timestamp': timestamp_list[i],
                        'camera_id': stream_ids[i],
                        'is_open': True,
                        'body_xyxy': body_xyxy if isinstance(body_xyxy, list) else body_xyxy.tolist(),
                        'face_xyxy': face_xyxy if isinstance(face_xyxy, list) else face_xyxy.tolist(),
                        'body_conf': body_conf if isinstance(body_conf, list) else body_conf.tolist(),
                        'face_conf': face_conf if isinstance(face_conf, list) else face_conf.tolist(),
                        'body_id': body_id,
                        'face_id': face_id,
                    })
                    if expression is not None and list_xyxy is not None and list_conf is not None:
                        vg_xyxy = list_xyxy[rcnt]
                        vg_conf = list_conf[rcnt]
                        processed_frame = draw_boxes(processed_frame, vg_xyxy, ids=[expression] * len(vg_conf),
                                                     conf=vg_conf,
                                                     color=(255, 0, 255), font_size=0.7)

                        message_list[-1]['vg_xyxy'] = vg_xyxy
                        message_list[-1]['vg_conf'] = vg_conf

                    pipes[i].stdin.write(processed_frame.tobytes())
                    pipes[i].stdin.flush()
                    # print(message_list)
                    # if len(message_list[-1]['face_xyxy']) > 0:
                    #     with open('example.json', 'w') as f:
                    #         json.dump(message_list, f)
                    #         exit(0)
                else:
                    message_list.append({
                        'timestamp': timestamp_list[i],
                        'camera_id': stream_ids[i],
                        'is_open': False,
                    })

                if lsat_processed_camera_status[i]:
                    rcnt += 1
                if camera_status[i]:
                    fcnt += 1
            # print(time.time() - t1)
            sender.put_data(message_list)
            cnt += 1


async def async_process_frames(frame_list, expression):
    task1 = asyncio.to_thread(stream_model.process, frame_list)
    task2 = asyncio.to_thread(stream_model.ALVG.process, frame_list, expression) if expression else None

    results, (list_xyxy, list_conf) = await asyncio.gather(task1, task2) if task2 else (await task1, (None, None))
    return results, list_xyxy, list_conf


@app.on_event("startup")
async def startup():
    asyncio.create_task(background_task())
