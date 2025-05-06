from reid import REID
from body_detect import YOLO11
import cv2
from tools import *
import time
import numpy as np
from mtcnn import MTCNN
from mtcnn.utils.images import load_image

# Create a detector instance
detector = MTCNN(device="cuda")

reid = REID('osnet_x1_0_market_256x128_amsgrad_ep150_stp60_lr0.0015_b64_fb10_softmax_labelsmooth_flip.pth')
target_man = cv2.imread(r"C:\Users\scyang\Desktop\jsjsj\man.png")

video_path = r'C:\Users\scyang\Desktop\jsjsj\MOTS\MOTS20-01.mp4'
cap = cv2.VideoCapture(video_path)
frame_rate = cap.get(cv2.CAP_PROP_FPS)  # 获取视频的原始帧率
frame_count = 0

model = YOLO11('yolo11m.pt')
people_xyxy = []
xyxy = []
cls = []
conf = []
names = model.get_cls()
possible_target = []
start_time = 0
while cap.isOpened():
    ret, frame = cap.read()
    frame = cv2.resize(frame, (frame.shape[1] // 2, frame.shape[0] // 2))
    original_frame = frame.copy()
    if not ret:
        break
    # 跳帧处理
    if frame_count % 2 == 0:
        # 模型推理
        xyxy, cls, conf = model.process_images(frame)
        xyxy = xyxy[0]
        cls = cls[0]
        conf = conf[0]
        people_xyxy = xyxy[cls == 0]
    elif frame_count % 3 == 0:
        people = crop_boxes(original_frame, people_xyxy)
        if people:
            # result = detector.detect_faces(people)
            people.append(target_man)
            features = reid.process_image_list(people)
            features, target = features[:-1], features[-1].unsqueeze(0)
            cosine_sim_matrix = cosine_similarity_matrix(target, features).cpu().numpy()[0]
            possible_target = cosine_sim_matrix > 0.7
            possible_target_xyxy = people_xyxy[possible_target]
            possible_target = crop_boxes(original_frame, possible_target_xyxy)

    # 显示帧
    frame = draw_boxes(frame, xyxy, cls, conf, names)

    right_panel_width = 200  # 右侧区域宽度
    padding = 10  # 图片之间的间距

    # 调整 possible_target 的大小
    target_height = frame.shape[0] // 3 - padding  # 每个目标图片的高度
    resized_targets = [cv2.resize(img, (right_panel_width, target_height)) for img in possible_target]

    # 创建右侧区域
    right_panel = np.zeros((frame.shape[0], right_panel_width, 3), dtype=np.uint8)  # 初始化右侧区域
    y_offset = 0  # 垂直偏移量

    # 将调整后的目标图片拼接到右侧区域
    for img in resized_targets:
        right_panel[y_offset:y_offset + img.shape[0], :img.shape[1]] = img
        y_offset += img.shape[0] + padding  # 更新垂直偏移量

    # 将右侧区域拼接到 frame
    combined_frame = np.hstack((frame, right_panel))

    cv2.imshow("Video Frame", combined_frame)

    if start_time == 0:
        start_time = time.time()
    elapsed_time = time.time() - start_time
    expected_time = frame_count / frame_rate
    wait_time = max(1, int((expected_time - elapsed_time) * 1000))  # 确保等待时间不为负
    if cv2.waitKey(wait_time) & 0xFF == ord('q'):
        break

    frame_count += 1

cap.release()
cv2.destroyAllWindows()

