# Details

Date : 2025-04-29 11:29:57

Directory d:\\ProjectA

Total : 70 files,  12927 codes, 1278 comments, 2551 blanks, all 16756 lines

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [ffmpeg-service/README.md](/ffmpeg-service/README.md) | Markdown | 14 | 0 | 5 | 19 |
| [ffmpeg-service/VideoFrameEncoder.py](/ffmpeg-service/VideoFrameEncoder.py) | Python | 199 | 40 | 57 | 296 |
| [ffmpeg-service/ffmpeg-stream.conf](/ffmpeg-service/ffmpeg-stream.conf) | NGINX Conf | 8 | 7 | 3 | 18 |
| [ffmpeg-service/ffmpeg-stream.sh](/ffmpeg-service/ffmpeg-stream.sh) | Shell Script | 16 | 8 | 6 | 30 |
| [nginx/nginx.conf](/nginx/nginx.conf) | NGINX Conf | 77 | 18 | 27 | 122 |
| [scripts/import\_sqlite.py](/scripts/import_sqlite.py) | Python | 45 | 23 | 15 | 83 |
| [web/README.md](/web/README.md) | Markdown | 161 | 0 | 91 | 252 |
| [web/\_\_init\_\_.py](/web/__init__.py) | Python | 0 | 0 | 1 | 1 |
| [web/api/\_\_init\_\_.py](/web/api/__init__.py) | Python | 7 | 1 | 0 | 8 |
| [web/api/ai\_connector.py](/web/api/ai_connector.py) | Python | 79 | 30 | 26 | 135 |
| [web/api/alerts.py](/web/api/alerts.py) | Python | 85 | 3 | 9 | 97 |
| [web/api/analysis.py](/web/api/analysis.py) | Python | 168 | 25 | 38 | 231 |
| [web/api/auth.py](/web/api/auth.py) | Python | 100 | 11 | 26 | 137 |
| [web/api/cameras.py](/web/api/cameras.py) | Python | 100 | 16 | 28 | 144 |
| [web/api/detection\_api.py](/web/api/detection_api.py) | Python | 95 | 9 | 22 | 126 |
| [web/api/person\_trajectory\_api.py](/web/api/person_trajectory_api.py) | Python | 177 | 24 | 46 | 247 |
| [web/api/user\_cameras.py](/web/api/user_cameras.py) | Python | 148 | 11 | 25 | 184 |
| [web/app.py](/web/app.py) | Python | 30 | 7 | 8 | 45 |
| [web/config.py](/web/config.py) | Python | 20 | 2 | 5 | 27 |
| [web/extensions.py](/web/extensions.py) | Python | 6 | 1 | 1 | 8 |
| [web/models/DetectionFrames.py](/web/models/DetectionFrames.py) | Python | 38 | 2 | 8 | 48 |
| [web/models/DetectionService.py](/web/models/DetectionService.py) | Python | 373 | 36 | 72 | 481 |
| [web/models/FaceAppearances.py](/web/models/FaceAppearances.py) | Python | 51 | 2 | 9 | 62 |
| [web/models/PersonAppearances.py](/web/models/PersonAppearances.py) | Python | 51 | 2 | 9 | 62 |
| [web/models/PersonTrajectory.py](/web/models/PersonTrajectory.py) | Python | 42 | 3 | 9 | 54 |
| [web/models/UserCameras.py](/web/models/UserCameras.py) | Python | 43 | 1 | 8 | 52 |
| [web/models/Users.py](/web/models/Users.py) | Python | 24 | 0 | 6 | 30 |
| [web/models/VideoService.py](/web/models/VideoService.py) | Python | 441 | 70 | 114 | 625 |
| [web/models/\_\_init\_\_.py](/web/models/__init__.py) | Python | 3 | 0 | 0 | 3 |
| [web/requirements.txt](/web/requirements.txt) | pip requirements | 10 | 0 | 0 | 10 |
| [web/routes/\_\_init\_\_.py](/web/routes/__init__.py) | Python | 7 | 0 | 2 | 9 |
| [web/routes/auth.py](/web/routes/auth.py) | Python | 20 | 0 | 4 | 24 |
| [web/routes/camera\_management.py](/web/routes/camera_management.py) | Python | 32 | 0 | 5 | 37 |
| [web/routes/dashboard.py](/web/routes/dashboard.py) | Python | 33 | 3 | 8 | 44 |
| [web/script/VideoFrameEncoder.py](/web/script/VideoFrameEncoder.py) | Python | 199 | 40 | 57 | 296 |
| [web/script/import\_sqlite.py](/web/script/import_sqlite.py) | Python | 48 | 19 | 15 | 82 |
| [web/static/css/add-camera.css](/web/static/css/add-camera.css) | CSS | 346 | 9 | 60 | 415 |
| [web/static/css/analysis.css](/web/static/css/analysis.css) | CSS | 178 | 4 | 37 | 219 |
| [web/static/css/common.css](/web/static/css/common.css) | CSS | 306 | 8 | 56 | 370 |
| [web/static/css/login.css](/web/static/css/login.css) | CSS | 134 | 3 | 21 | 158 |
| [web/static/css/monitor-detail.css](/web/static/css/monitor-detail.css) | CSS | 364 | 12 | 66 | 442 |
| [web/static/css/person\_trajectory.css](/web/static/css/person_trajectory.css) | CSS | 535 | 20 | 101 | 656 |
| [web/static/css/profile.css](/web/static/css/profile.css) | CSS | 494 | 10 | 69 | 573 |
| [web/static/css/situation.css](/web/static/css/situation.css) | CSS | 1,348 | 32 | 211 | 1,591 |
| [web/static/css/style.css](/web/static/css/style.css) | CSS | 250 | 11 | 47 | 308 |
| [web/static/js/add-camera.js](/web/static/js/add-camera.js) | JavaScript | 316 | 54 | 71 | 441 |
| [web/static/js/analysis.js](/web/static/js/analysis.js) | JavaScript | 295 | 30 | 56 | 381 |
| [web/static/js/camera-management.js](/web/static/js/camera-management.js) | JavaScript | 321 | 43 | 49 | 413 |
| [web/static/js/common.js](/web/static/js/common.js) | JavaScript | 285 | 63 | 48 | 396 |
| [web/static/js/flv.min.js](/web/static/js/flv.min.js) | JavaScript | 2 | 8 | 0 | 10 |
| [web/static/js/login.js](/web/static/js/login.js) | JavaScript | 42 | 7 | 9 | 58 |
| [web/static/js/monitor-detail.js](/web/static/js/monitor-detail.js) | JavaScript | 236 | 57 | 69 | 362 |
| [web/static/js/person\_trajectory.js](/web/static/js/person_trajectory.js) | JavaScript | 538 | 112 | 110 | 760 |
| [web/static/js/profile.js](/web/static/js/profile.js) | JavaScript | 338 | 35 | 56 | 429 |
| [web/static/js/register.js](/web/static/js/register.js) | JavaScript | 53 | 7 | 11 | 71 |
| [web/static/js/situation.js](/web/static/js/situation.js) | JavaScript | 555 | 84 | 109 | 748 |
| [web/static/js/video-flv.js](/web/static/js/video-flv.js) | JavaScript | 462 | 194 | 118 | 774 |
| [web/templates/README.md](/web/templates/README.md) | Markdown | 149 | 0 | 63 | 212 |
| [web/templates/add-camera.html](/web/templates/add-camera.html) | HTML | 193 | 5 | 22 | 220 |
| [web/templates/analysis.html](/web/templates/analysis.html) | HTML | 117 | 5 | 10 | 132 |
| [web/templates/camera-management.html](/web/templates/camera-management.html) | HTML | 567 | 8 | 82 | 657 |
| [web/templates/edit-camera.html](/web/templates/edit-camera.html) | HTML | 554 | 4 | 80 | 638 |
| [web/templates/index.html](/web/templates/index.html) | HTML | 254 | 13 | 9 | 276 |
| [web/templates/login.html](/web/templates/login.html) | HTML | 44 | 0 | 0 | 44 |
| [web/templates/monitor-detail.html](/web/templates/monitor-detail.html) | HTML | 106 | 10 | 6 | 122 |
| [web/templates/person\_trajectory.html](/web/templates/person_trajectory.html) | HTML | 203 | 11 | 10 | 224 |
| [web/templates/profile.html](/web/templates/profile.html) | HTML | 103 | 5 | 10 | 118 |
| [web/templates/register.html](/web/templates/register.html) | HTML | 52 | 0 | 3 | 55 |
| [文档/时间同步.md](/%E6%96%87%E6%A1%A3/%E6%97%B6%E9%97%B4%E5%90%8C%E6%AD%A5.md) | Markdown | 177 | 0 | 51 | 228 |
| [文档/调研物理世界计算机视觉攻击.md](/%E6%96%87%E6%A1%A3/%E8%B0%83%E7%A0%94%E7%89%A9%E7%90%86%E4%B8%96%E7%95%8C%E8%AE%A1%E7%AE%97%E6%9C%BA%E8%A7%86%E8%A7%89%E6%94%BB%E5%87%BB.md) | Markdown | 60 | 0 | 66 | 126 |

[Summary](results.md) / Details / [Diff Summary](diff.md) / [Diff Details](diff-details.md)