# AI Server

MediaPipe로 양손·상체·얼굴 좌표를 추출하고, 기준 수어 좌표와 DTW로 비교해 의료 수어 단어를 반환한다.

현재 `recordings/`의 활성 기준 샘플은 새 수집을 위해 비워둔 상태다.
새 샘플이 저장되고 AI API 또는 촬영 프로그램을 재시작하기 전에는
단어 인식이 동작하지 않는다. 이전 샘플은 Git 기록(커밋 `529ef5e`)에
남아 있으며, 필요하면 `git checkout 529ef5e -- ai-server/recordings`로
복원할 수 있다.

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
연결할 수 없으면 마지막 동기화 목록(`ai-server/.cache/`, Git 제외)을
사용하고, 캐시도 없으면 저장소의 `ai-server/sign_words.default.json`
기본 목록으로 실행된다. 단어 메뉴가 예상과 다르면 `ai-server/.cache`
폴더를 삭제하고 다시 시작한다.

다른 주소를 사용하려면 환경변수를 설정한다.

```bash
export SIGN_WORD_API_URL='http://localhost:8080/api/sign-words'
```

### 엔드포인트

- `GET /health`: 서버 상태와 사용 중인 기준 샘플 수
- `GET /api/sign/words`: 인식 가능한 단어 목록
- `POST /api/sign/analyze`: 촬영 완료 후 전체 영상에서 1~5개 단어 후보 분석

이전 `/api/sign/analyze-sequence` 경로도 같은 분석을 수행한다.

영상 업로드 크기는 최대 50MB다. 분석에 사용한 임시 영상은 요청 처리 후 삭제한다.

## 개발용 카메라 테스트

기준 데이터 수집에 참여하는 사람은 저장소를 복제하고 의존성을 설치한 뒤,
촬영 프로그램을 실행하면 나오는 질문에 실명 대신 자신만의 익명 촬영자 코드를
입력한다. 입력이 끝나면 웹캠 창이 열린다. 같은 사람은 다음 촬영에서도 같은
코드를 사용한다. Chrome 등 다른 앱이 카메라를 사용 중이면 먼저 닫는다.

```bash
git clone https://github.com/NagyeongAhn/medical-sign-language.git
cd medical-sign-language
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r ai-server/requirements.txt
python ai-server/hand_tracker.py
```

실행하면 `촬영자 코드를 입력하세요:`가 표시된다. 코드(예: `p01`)를 입력하고
Enter를 누르면 웹캠 창이 열리며, 화면에 `SIGNER: p01`이 표시된다. 저장할
때마다 해당 촬영자의 단어별 누적 샘플 수가 터미널에 출력된다. 환경변수
`SIGNER_ID`를 설정해 두면 그 값이 기본값으로 제안되어 Enter만 눌러도 된다.

- Spring Boot 단어 사전에 등록된 `recordingKey`: 기준 수어 촬영 시작
- `0`: 저장하지 않는 테스트 촬영 시작
- `Space`: 촬영 종료 및 저장 또는 분석
- `Esc`: 종료

`ai-server/sign_words.default.json`의 기본 단어는 백엔드 없이도
촬영할 수 있다. 새 단어를 추가할 때는 이 JSON 파일과 백엔드 마이그레이션에
같은 `wordId`, `wordLabel`, 촬영 키를 함께 등록한다. 촬영 키는 한 글자이며
중복될 수 없다. 촬영 키로 `q`, `r`도 사용할 수 있도록 종료는 `Esc`, 테스트
촬영은 `0`으로 시작한다. 프로그램 시작 시 표시되는 단어 메뉴와 촬영자
코드를 확인한다.

촬영 파일은 `ai-server/recordings/<wordId>/sample_<SIGNER_ID>_<고유ID>.json`
형태로 저장된다. 파일에는 원본 영상 대신 프레임별 손·상체·얼굴 좌표와
촬영자 코드가 들어간다. 촬영자 코드에 이름, 학번 등 개인 식별 정보를
사용하지 않는다. 여러 사람이 같은 단어를 촬영해도 파일명이 겹치지 않는다.

한 번에 한 단어만 촬영하고, 잘못 표현했거나 손이 화면 밖으로 나간 샘플은
제출하지 않는다. 기준 데이터와 시험 데이터는 촬영자별로 구분해 평가할
수 있도록, 제출할 때 어떤 촬영자 코드를 사용했는지 기록한다. 데이터
공유와 저장에 동의한 참여자의 좌표 파일만 저장소에 제출한다.

참여자는 새 JSON 파일을 별도 브랜치의 Pull Request로 제출하거나,
`ai-server/recordings` 아래 새 파일만 모아 담당자에게 전달할 수 있다.
담당자는 샘플의 단어 라벨과 검출 품질을 확인한 뒤 기준 목록에 반영한다.
