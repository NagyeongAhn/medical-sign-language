# Windows 수어 데이터 수집 안내

이 안내서는 Windows PC에서 수어 샘플을 촬영하고 전달하는 방법입니다. **Spring Boot 백엔드, MySQL, 프론트엔드는 실행하지 않습니다.** Python 수집 프로그램과 이 저장소의 기본 단어 목록만 사용합니다.

## 1. 준비물

- Windows 10 또는 11, 64비트 PC
- 카메라가 연결된 PC
- Git for Windows
- Python 3.10 64비트

프로젝트는 `mediapipe==0.10.9`를 사용합니다. 이 버전은 Windows x64용 CPython 3.10 휠을 제공합니다. 설치 파일을 받을 때 32비트나 Microsoft Store 버전 대신 Python 3.10 64비트를 설치하세요. ([MediaPipe 0.10.9 패키지 정보](https://pypi.org/project/mediapipe/0.10.9/))

## 2. 코드 다운로드와 설치

수집 담당자가 이 안내서와 최신 단어 목록 변경 사항을 먼저 GitHub에 올린 뒤, 참여자에게 저장소 주소를 전달해야 합니다. 내려받는 코드에 최신 단어 목록이 포함되어 있어야 합니다.

PowerShell을 열고 아래 명령을 차례대로 실행합니다.

```powershell
git clone https://github.com/NagyeongAhn/medical-sign-language.git
cd medical-sign-language

py -3.10 --version
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r .\ai-server\requirements.txt
```

설치가 끝났는지 확인합니다.

```powershell
.\.venv\Scripts\python.exe -c "import cv2, mediapipe; print('OpenCV', cv2.__version__); print('MediaPipe', mediapipe.__version__)"
```

버전 두 개가 출력되면 설치가 완료된 것입니다. 이 프로젝트를 받는 사람은 백엔드 코드를 빌드하거나 MySQL을 설치할 필요가 없습니다.

## 3. 촬영자 코드 정하기

촬영자 코드는 이름이나 학번 대신 `p01`처럼 익명 코드를 사용합니다. 한 사람이 여러 번 참여할 때는 매번 같은 코드를 입력합니다. 허용 문자는 영문자, 숫자, `_`, `-`이며 1~32자입니다.

PowerShell에서 코드를 설정합니다. 아래 예시는 `p01`입니다.

```powershell
$env:SIGNER_ID = "p01"
```

## 4. 수집 프로그램 실행

프로젝트 루트 폴더(`medical-sign-language`)에서 실행합니다.

```powershell
.\.venv\Scripts\python.exe .\ai-server\hand_tracker.py
```

프로그램이 단어 메뉴와 키 목록을 터미널에 표시하고 웹캠 창을 엽니다. 서버에 연결할 수 없으면 잠시 후 로컬 기본 사전으로 실행합니다. 메뉴에 총 **54개 단어**가 표시되는지 확인하세요. 5개만 표시된다면 저장소의 최신 변경 사항을 받았는지 확인하고, 기존 로컬 캐시가 있다면 다음 명령으로 지운 뒤 다시 실행합니다.

```powershell
Remove-Item -Recurse -Force .\ai-server\.cache -ErrorAction SilentlyContinue
```

## 5. 한 단어씩 촬영하기

1. 터미널 메뉴에서 수집할 단어의 키를 찾습니다.
2. 웹캠 창을 클릭하고 해당 키를 누릅니다.
3. 화면에 머리, 상체와 양손이 잘 보이도록 한 뒤 **선택한 단어 하나만** 표현합니다.
4. 표현이 끝나면 `Space`를 눌러 저장합니다.
5. 터미널에 `[저장 완료]`가 표시되고 누적 개수가 증가했는지 확인합니다.
6. 다음 단어도 같은 방식으로 촬영합니다.

단어가 틀렸거나 손이 화면 밖으로 나갔거나 추적 화면에 손이 제대로 표시되지 않았다면 그 샘플은 저장하지 말고 다시 촬영합니다. 여러 단어를 한 번에 표현해 저장하지 말고, 수집 메뉴에서 선택한 단어 하나씩 저장합니다.

### 조작 키

| 키 | 기능 |
|---|---|
| 메뉴에 표시된 단어 키 | 해당 단어 촬영 시작 |
| `Space` | 촬영 종료 및 데이터 저장 |
| `0` | 저장하지 않는 테스트 촬영 시작 |
| `Esc` | 프로그램 종료 |
| `Shift+A`~`Shift+S` | 대문자로 표시된 단어 촬영 키 입력 |

### 단어별 촬영 키

| 키 | 단어 | 키 | 단어 | 키 | 단어 |
|---|---|---|---|---|---|
| `1` | 병원 | `2` | 아프다 | `3` | 약 |
| `4` | 의사 | `5` | 도와주세요 | `6` | 머리 |
| `7` | 목 | `8` | 가슴 | `9` | 배 |
| `a` | 허리 | `b` | 팔 | `c` | 다리 |
| `d` | 눈 | `e` | 귀 | `f` | 손 |
| `g` | 발 | `h` | 등 | `i` | 왼쪽 |
| `j` | 오른쪽 | `k` | 열 | `l` | 기침 |
| `m` | 토하다 | `n` | 설사 | `o` | 어지럽다 |
| `p` | 가렵다 | `q` | 메스껍다 | `r` | 숨쉬기 어렵다 |
| `s` | 피 | `t` | 다치다 | `u` | 쓰러지다 |
| `v` | 붓다 | `w` | 알레르기 | `x` | 오늘 |
| `y` | 어제 | `z` | 계속 | `Shift+A` | 방금 |
| `Shift+B` | 며칠 | `Shift+C` | 갑자기 | `Shift+D` | 가끔 |
| `Shift+E` | 많이 | `Shift+F` | 심하다 | `Shift+G` | 조금 |
| `Shift+H` | 더 심해지다 | `Shift+I` | 나아지다 | `Shift+J` | 네 |
| `Shift+K` | 아니요 | `Shift+L` | 임신 | `Shift+M` | 수술한 적 있다 |
| `Shift+N` | 약을 먹고 있다 | `Shift+O` | 모르겠다 | `Shift+P` | 다시 |
| `Shift+Q` | 천천히 | `Shift+R` | 통역 | `Shift+S` | 보호자 |

## 6. 저장 위치와 전달

샘플은 단어별 폴더에 JSON으로 저장됩니다.

```text
ai-server/recordings/<단어ID>/sample_<촬영자코드>_<고유ID>.json
```

파일에는 원본 영상이 아니라 프레임별 손·상체·얼굴 좌표와 익명 촬영자 코드가 들어갑니다. 수집을 마치면 `ai-server/recordings` 폴더를 압축해 담당자가 지정한 전달 경로로 보내세요. 다른 참여자의 파일을 삭제하거나 수정하지 마세요. 촬영 전에 데이터 수집 및 전달에 동의한 참여자만 촬영합니다.

## 7. 자주 발생하는 문제

### `ModuleNotFoundError: No module named 'cv2'`

가상환경의 Python으로 의존성을 설치하고 실행했는지 확인합니다.

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\ai-server\requirements.txt
.\.venv\Scripts\python.exe .\ai-server\hand_tracker.py
```

### 웹캠이 열리지 않음

Teams, Zoom, 브라우저 등 카메라를 사용하는 앱을 종료하고 다시 실행합니다. Windows 설정에서 카메라 권한이 허용됐는지도 확인합니다.

### 키를 눌러도 촬영이 시작되지 않음

먼저 웹캠 창을 클릭한 뒤 키를 누릅니다. 대문자 키는 `Shift`를 누르고 입력합니다. 현재 촬영 중인 단어가 있다면 `Space`로 종료한 다음 다른 단어를 선택합니다.

### 54개보다 적은 단어가 표시됨

최신 변경 사항이 GitHub에 올라와 있는지 확인하고 코드를 다시 내려받습니다. 앞의 캐시 삭제 명령도 실행한 뒤 프로그램을 다시 시작합니다.
