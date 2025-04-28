#!/usr/bin/env python
import os
import sys
import json
import argparse
import datetime
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# 导入Flask应用和数据库模型
from web.app import create_app
from web.models.UserCameras import UserCamera
from web.models.DetectionService import DetectionService


def import_data(json_file, camera_id):
    """导入JSON数据到数据库"""
    
    # 创建应用上下文
    app = create_app()
    with app.app_context():
        # 查找摄像头
        # 读取JSON文件
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                detection_data = json.load(f)
                print(f"读取JSON文件成功: {json_file}")
        except Exception as e:
            print(f"读取JSON文件出错: {str(e)}")
            return False
        
        # 检查数据结构
        if not isinstance(detection_data, list):
            print("错误: JSON文件应该包含检测事件列表")
            return False
        print(f"找到 {len(detection_data)} 条检测记录")
        count = 0
        # 导入数据
        try:
            for i, event in enumerate(detection_data):
                # 确保基本字段存在
                # if 'frame_number' not in event or 'timestamp' not in event:
                #     print(f"警告: 跳过第 {i+1} 条记录，缺少必要字段")
                #     jump_count += 1
                #     continue
                # if event.get('person_count', 0) == 0 and event.get('face_count', 0) == 0:
                #     print(f"警告: 跳过第 {i+1} 条记录，检测到0个对象")
                #     jump_count += 1
                #     continue
                
                event['camera_id'] = camera_id
                # 使用DetectionService处理检测数据
                try:
                    DetectionService.process_detection_data(event)
                    count += 1
                    # 定期显示进度
                    if (i + 1) % 50 == 0 or i == 0 or i == len(detection_data) - 1:
                        print(f"已导入 {i+1}/{len(detection_data)} 条记录")
                except Exception as e:
                    print(f"处理第 {i+1} 条记录时出错: {str(e)}")
            
            print(f"成功导入{count}/ {len(detection_data)} 条检测记录到摄像头 {camera_id}")
            return True
            
        except Exception as e:
            print(f"导入数据时出错: {str(e)}")
            return False

if __name__ == "__main__":
    success = import_data('../test/view-GL1.json',1)
    success = import_data('../test/view-GL2.json',2)
    success = import_data('../test/view-GL5.json',3)
    success = import_data('../test/view-GL6.json',4)
    sys.exit(0 if success else 1)



