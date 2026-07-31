# AI Server

MediaPipe로 양손·상체·얼굴 좌표를 추출하고, 기준 수어 좌표와 DTW로 비교해 의료 수어 단어를 반환한다.

## 실행 환경

- Python 3.9 이상
- macOS 또는 데스크톱 환경
- OpenCV가 읽을 수 있는 `webm`, `mp4`, `mov`, `avi` 영상

## 설치

프로젝트 루트에서 다음 명령을 실행한다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r ai-server/requirements.txt
```

## 분석 API 실행

```bash
source .venv/bin/activate
python -m uvicorn api.main:app --reload --app-dir ai-server
```

- API 서버: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

단어 목록은 시작할 때 Spring Boot의
`http://localhost:8080/api/sign-words`에서 불러온다. Spring Boot에
연결할 수 없으면 마지막 동기화 목록을 사용하고, 캐시도 없으면 기존
5개 기본 단어로 실행된다.

다른 주소를 사용하려면 환경변수를 설정한다.

```bash
export SIGN_WORD_API_URL='http://localhost:8080/api/sign-words'
```

### 엔드포인트

- `GET /health`: 서버 상태와 사용 중인 기준 샘플 수
- `GET /api/sign/words`: 인식 가능한 단어 목록
- `POST /api/sign/analyze`: 수어 영상 파일 분석
- `POST /api/sign/analyze-sequence`: 0.8초 정지로 구분한 연속 수어 분석

영상 업로드 크기는 최대 50MB다. 분석에 사용한 임시 영상은 요청 처리 후 삭제한다.

## 개발용 카메라 테스트

```bash
python ai-server/hand_tracker.py
```

- Spring Boot 단어 사전에 등록된 `recordingKey`: 기준 수어 촬영 시작
- `R`: 저장하지 않는 테스트 촬영 시작
- `Space`: 촬영 종료 및 저장 또는 분석
- `Q`: 종료
