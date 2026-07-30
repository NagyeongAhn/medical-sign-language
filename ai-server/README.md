# AI Server

MediaPipe와 OpenCV를 이용한 손 추적 프로토타입이다. 현재는 웹캠에서 한 손을 인식하고, 손가락의 펼침 상태를 규칙으로 판별한다.

## 실행 환경

- Python 3.9 이상
- 카메라가 연결된 macOS 또는 데스크톱 환경

## 설치 및 실행

프로젝트 루트에서 다음 명령을 실행한다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r ai-server/requirements.txt
python ai-server/hand_tracker.py
```

macOS에서는 처음 실행할 때 터미널 또는 IDE의 카메라 접근 권한을 허용해야 한다. 웹캠 창을 선택하고 `q`를 누르면 종료된다.

현재 코드는 REST API 서버가 아니다. 이후 FastAPI 기반 영상 분석 API로 확장할 예정이다.
