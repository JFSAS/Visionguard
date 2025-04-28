import cv2
import random

class VideoFrameEncoder:
    """
    视频帧编码器类
    该类用于将视频帧序号编码到视频帧中，并提供解码功能。
    """

    def __init__(self, max_binary_length=32, blocks_per_row=8):
        """
        初始化视频帧编码器
        :param max_binary_length: 最大二进制长度
        :param blocks_per_row: 每行的块数
        """
        self.max_binary_length = max_binary_length
        self.blocks_per_row = blocks_per_row
        self.frame_count = 0
    
    def encode_frame(self, frame, frame_number):
        """
        将帧序号编码到视频帧中
        :param frame: 视频帧
        :param frame_number: 帧序号
        :return: 编码后的帧
        """
        # 将当前帧号转换为二进制
        binary_str = bin(frame_number)[2:].zfill(self.max_binary_length)  # 填充0确保长度一致
        binary_data = [int(bit) for bit in binary_str]
        # 第一行为标志行
        for i in range(0, self.blocks_per_row, 2):
            frame[0, i] = [255, 255, 255]
            frame[0, i+1] = [0, 0, 0]

        # 在每一帧嵌入帧序号的二进制编码
        for i, bit in enumerate(binary_data):
            row = i // self.blocks_per_row + 1  # 从第二行开始编码
            col = i % self.blocks_per_row
            
            # 计算像素位置
            y = row
            x = col
            
            # 根据bit值设置像素
            if bit == 1:
                # 为1时设置白色像素
                frame[y, x] = [255, 255, 255]
            else:
                # 为0时设置黑色像素
                frame[y, x] = [0, 0, 0]

        # 写入帧
        return frame

    def decode_frame(self, frame):
        """
        从视频帧中解码帧序号
        :param frame: 视频帧
        :return: 解码后的帧序号
        """
        # 从视频帧提取二进制数据
        # 第一行为标志行
        for i in range(0, self.blocks_per_row, 2):
            if frame[0, i][0] < 128 or frame[0, i+1][0] >= 128:
                print("无法识别标记行，解码失败")
                return None
        
        # 提取帧序号
        extracted_bits = []
        for i in range(self.max_binary_length):
            row = i // self.blocks_per_row + 1  # 从第二行开始解码
            col = i % self.blocks_per_row
            y = row
            x = col
            # 根据像素值判断是0还是1
            pixel = frame[y, x]
            bit = 1 if pixel[0] > 128 else 0  # 大于128认为是白色(1)，否则是黑色(0)
            extracted_bits.append(bit)
        
        # 将二进制转换回帧序号
        binary_str_decoded = ''.join([str(bit) for bit in extracted_bits])
        decoded_frame_number = int(binary_str_decoded, 2)
        
        return decoded_frame_number

    def encode_video(self, input_path, output_path, codec='mp4v'):
            """
            编码整个视频文件
            :param input_path: 输入视频路径
            :param output_path: 输出视频路径
            :param codec: 视频编解码器
            :return: 是否成功
            """
            
            # 打开输入视频
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                print(f"Error: 无法打开输入视频文件 {input_path}")
                return False
            
            # 获取视频参数
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if fps == 0:
                fps = 30  # 默认值
            
            print(f"视频信息: {width}x{height}, {fps}fps, 总帧数: {total_frames}")
            
            # 创建视频写入器
            if codec == 'h264':
                import subprocess
                import numpy as np
                
                try:
                    # 检查FFmpeg是否可用
                    subprocess.run(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                    print("FFmpeg已安装，将使用FFmpeg进行H.264编码")
                    
                    # 使用管道模式启动FFmpeg进程
                    command = [
                        'ffmpeg',
                        '-y',
                        '-f', 'rawvideo',
                        '-vcodec', 'rawvideo',
                        '-s', f'{width}x{height}',
                        '-pix_fmt', 'bgr24',
                        '-r', str(fps),
                        '-i', '-',  # 从stdin读取
                        '-c:v', 'libx264',
                        '-preset', 'fast',  # 使用faster或fast以提高速度
                        '-crf', '23',
                        '-pix_fmt', 'yuv420p',
                        output_path
                    ]
                    
                    # 启动FFmpeg进程
                    process = subprocess.Popen(
                        command, 
                        stdin=subprocess.PIPE, 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE
                    )
                    
                    frame_count = 0
                    while True:
                        ret, frame = cap.read()
                        if not ret:
                            break
                        
                        frame_count += 1
                        
                        # 编码帧
                        encoded_frame = self.encode_frame(frame, frame_count)
                        
                        # 直接将帧数据写入FFmpeg的stdin
                        process.stdin.write(encoded_frame.tobytes())
                        
                        # 每100帧打印一次进度
                        if frame_count % 100 == 0:
                            print(f"已处理 {frame_count}/{total_frames} 帧 ({frame_count/total_frames*100:.1f}%)")
                    
                    # 释放cap
                    cap.release()
                    
                    # 等待FFmpeg处理完成
                    stdout, stderr = process.communicate()
                    
                    # 检查FFmpeg是否成功
                    if process.returncode != 0:
                        print(f"FFmpeg编码失败: {stderr.decode()}")
                        return False
                    
                    print(f"视频处理完成，共处理 {frame_count} 帧")
                    return True
                    
                except (subprocess.SubprocessError, FileNotFoundError) as e:
                    print(f"警告: FFmpeg错误: {e}")
                    print("回退到OpenCV编码器")
                    return False


            # 使用opencv编码
            fourcc = cv2.VideoWriter_fourcc(*codec)
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            if not out.isOpened():
                print(f"Error: 无法创建输出视频文件 {output_path}")
                cap.release()
                return False
            
            try:
                # 处理每一帧
                frame_count = 0
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                        
                    frame_count += 1
                    
                    # 编码帧
                    encoded_frame = self.encode_frame(frame, frame_count)
                    
                    # 写入帧
                    out.write(encoded_frame)
                    
                    # 每100帧打印一次进度
                    if frame_count % 100 == 0:
                        print(f"已处理 {frame_count}/{total_frames} 帧 ({frame_count/total_frames*100:.1f}%)")
                
                print(f"视频处理完成，共处理 {frame_count} 帧")
                return True
                
            except Exception as e:
                print(f"处理视频时出错: {e}")
                return False
                
            finally:
                # 释放资源
                cap.release()
                out.release()

    def verify_video(self, encoded_video_path, sample_frames=5, random_sampling=True):
        """
        验证编码视频
        :param encoded_video_path: 编码视频路径
        :param sample_frames: 要验证的帧数
        :param random_sampling: 是否随机抽样，False则验证前N帧
        :return: 验证通过的帧数和总验证帧数
        """

        
        # 打开编码视频
        cap = cv2.VideoCapture(encoded_video_path)
        if not cap.isOpened():
            print(f"Error: 无法打开编码视频文件 {encoded_video_path}")
            return 0, 0
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # 决定要验证的帧
        if random_sampling:
            # 随机抽取帧进行验证
            frames_to_check = sorted(random.sample(range(1, total_frames+1), 
                                             min(sample_frames, total_frames)))
        else:
            # 验证前N帧
            frames_to_check = list(range(1, min(sample_frames+1, total_frames+1)))
        
        successful_frames = 0
        
        for check_frame in frames_to_check:
            # 跳转到指定帧
            cap.set(cv2.CAP_PROP_POS_FRAMES, check_frame-1)
            ret, frame = cap.read()
            
            if not ret:
                print(f"Error: 无法读取帧 #{check_frame}")
                continue
            
            print(f"\n验证帧 #{check_frame}:")
            
            # 解码帧
            decoded_frame_number = self.decode_frame(frame)
            
            # 显示解码结果
            print(f"解码后的帧序号: {decoded_frame_number}")
            
            # 验证解码是否正确
            if decoded_frame_number == check_frame:
                print("✓ 验证成功: 解码帧序号与实际帧序号一致")
                successful_frames += 1
            else:
                print(f"✗ 验证失败: 解码帧序号与实际帧序号不一致，差异: {abs(decoded_frame_number - check_frame)}")
        
        cap.release()
        
        # 返回验证结果
        return successful_frames, len(frames_to_check)
    
if __name__ == "__main__":
    encoder = VideoFrameEncoder(max_binary_length=32, blocks_per_row=8)
    import os
    videos = os.listdir("videos")
    for video in videos:
        input_path = os.path.join("videos", video)
        output_path = os.path.join("processed_videos", f"encoded_{video}")
        
        print(f"正在编码视频: {input_path}")
        encoder.encode_video(input_path, output_path, codec='h264')
        
        print(f"正在验证编码视频: {output_path}")
        successful_frames, total_frames = encoder.verify_video(output_path, sample_frames=5, random_sampling=True)
        
        print(f"验证结果: 成功解码 {successful_frames}/{total_frames} 帧")