# 손끝진료

카메라로 의료 수어를 촬영하면 손·상체·얼굴의 움직임을 분석해 단어를
인식하고, 여러 단어를 환자가 의료진에게 전달할 자연스러운 문장으로
변환하는 프로젝트입니다.

## 주요 기능

- 브라우저 카메라를 이용한 수어 촬영
- 촬영 완료 후 한 단어 또는 여러 단어를 같은 흐름으로 인식
- MediaPipe 기반 양손·상체·얼굴 좌표 추출
- DTW 기반 기준 수어 동작 비교
- 최대 5개의 인식 단어 수집 및 순서 관리
- Gemini를 이용한 자연스러운 의료 문장 생성
- 영상 메타데이터, 인식 단어, 유사도, 생성 문장 저장
- Spring Boot 단어 사전과 Python AI 서버 간 동기화

## 시스템 구조

```text
[React Frontend]
  카메라 촬영 및 결과 표시
          |
          | 영상 전송
          v
[Python AI Server]
  MediaPipe 좌표 추출
  동작 구간 분리
  DTW 기준 샘플 비교
          |
          | 인식 단어와 유사도
          v
[Spring Boot Backend]
  단어 유효성 검증
  Gemini 문장 생성
  영상 및 번역 데이터 관리
          |
          v
[MySQL]
  수어 사전, 영상 메타데이터,
  인식 단어와 생성 문장 저장
```

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| Frontend | React, Vite, MediaRecorder API |
| AI Server | Python, FastAPI, OpenCV, MediaPipe, NumPy |
| Backend | Java 21, Spring Boot, Spring Data JPA, Flyway |
| Database | MySQL 8 |
| 영상 정보 분석 | FFprobe |
| 문장 생성 | Gemini API |

## 수어 인식 구조

현재 인식기는 학습된 딥러닝 분류 모델이 아니라, 새로 촬영한 동작을
단어별 기준 좌표 샘플과 비교하는 방식입니다.

### 1. 기준 동작 저장

각 의료 수어를 여러 번 촬영하고 프레임마다 다음 좌표를 JSON으로
저장합니다.

- 양손: 손마다 21개 관절
- 상체: 양쪽 어깨, 팔꿈치, 손목
- 얼굴: 코, 눈 바깥점, 입꼬리, 턱
- 프레임 번호와 촬영 시각

사전에 등록된 촬영 대상 단어는 다음 5개입니다. 현재 기준 샘플은 새로
수집하기 위해 비워둔 상태이며, 샘플이 쌓이기 전에는 인식할 수 없습니다.

| ID | 단어 | 분류 |
| --- | --- | --- |
| `hospital` | 병원 | 장소 |
| `sick` | 아프다 | 증상 |
| `medicine` | 약 | 의약품 |
| `doctor` | 의사 | 사람 |
| `help` | 도와주세요 | 요청 |

### 2. 입력 영상 좌표 추출

Python 분석 서버가 OpenCV로 영상을 읽고, MediaPipe로 각 프레임의
손·상체·얼굴 좌표를 추출합니다. 손이나 상체가 충분히 감지되지 않으면
분석 오류를 반환합니다.

### 3. 좌표 정규화

사용자의 위치와 카메라 거리에 따른 차이를 줄이기 위해 양쪽 어깨의
중간점을 원점으로, 어깨 너비를 크기 기준으로 사용합니다.

```text
정규화 좌표 = (현재 좌표 - 어깨 중심) / 어깨 너비
```

검출되지 않은 일부 좌표는 앞뒤 프레임 값으로 보간하며, 순간적인
오검출 좌표는 제한된 범위로 보정합니다.

### 4. 특징 벡터 생성

정규화된 좌표를 프레임별 고정 길이 숫자 배열로 변환합니다.
비교 시 손 좌표를 가장 중요하게 사용하고, 상체에는 `0.5`, 얼굴에는
`0.25`의 가중치를 적용합니다.

### 5. DTW 동작 비교

사람마다 수어를 수행하는 속도가 다르므로 DTW(Dynamic Time Warping)를
사용해 입력 동작과 기준 동작의 시간축을 정렬합니다.

각 단어에서 가장 가까운 기준 샘플 3개의 평균 거리를 구하고, 거리가
가장 작은 단어를 최종 결과로 선택합니다. 최종 거리가 `0.40`보다 크면
억지로 단어를 선택하지 않고 `인식할 수 없음`을 반환합니다.

화면에 표시하는 유사도는 다음과 같이 계산합니다.

```text
유사도 = 1 / (1 + DTW 거리)
```

이 값은 학습 모델이 계산한 확률이 아니라, DTW 거리를 사용자가
이해하기 쉬운 형태로 변환한 지표입니다.

### 6. 촬영 완료 후 단어 순서 분석

촬영이 끝난 전체 영상의 여러 경계 후보를 DTW로 비교해 최대 5개
단어의 순서를 선택합니다. 한 단어도 같은 분석 경로를 사용합니다.
단어 사이에 일정 시간 멈출 필요는 없습니다. 각 후보 구간이 기준
샘플과 충분히 가까워야 하며,
단어를 불필요하게 쪼개지 않도록 추가 단어에는 비용을 부여합니다.
현재는 짧은 영상용 시험 기능이며, 실제 연속 한국수어 정확도는 새 기준
샘플과 별도 연속 촬영 영상으로 검증해야 합니다.

## 디렉터리 구조

```text
project/
├── frontend/                    # React 촬영 및 결과 화면
├── ai-server/
│   ├── api/                     # FastAPI 엔드포인트
│   ├── comparison/              # 정규화, 경계 후보 탐색, DTW 비교
│   ├── trackers/                # 손·상체·얼굴 MediaPipe 추적기
│   ├── recordings/              # 단어별 기준 좌표 샘플
│   ├── services/                # 영상 분석 및 촬영 데이터 관리
│   └── evaluate_references.py   # 기준 샘플 교차 검증
├── backend/signlanguage/
│   └── src/
│       ├── main/java/           # 영상, 단어 사전, 번역 API
│       └── main/resources/
│           └── db/migration/    # Flyway DB 스키마
└── uploads/                     # 백엔드가 저장하는 영상
```

## API

### Python AI 서버

| Method | 경로 | 기능 |
| --- | --- | --- |
| GET | `/health` | 서버 상태와 기준 샘플 개수 |
| GET | `/api/sign/words` | 인식 가능한 단어 목록 |
| POST | `/api/sign/analyze` | 촬영 완료 영상에서 1~5개 단어 분석 |

이전 `/api/sign/analyze-sequence` 경로는 호환용으로 같은 분석을 수행합니다.

AI 서버는 최대 50MB의 `webm`, `mp4`, `mov`, `avi` 영상을 받으며,
분석이 끝나면 임시 파일을 삭제합니다.

### Spring Boot 백엔드

| Method | 경로 | 기능 |
| --- | --- | --- |
| POST | `/api/videos` | 영상 저장 및 메타데이터 등록 |
| GET | `/api/videos/{videoId}` | 영상 메타데이터 조회 |
| GET | `/api/sign-words` | 활성 수어 단어 사전 조회 |
| POST | `/api/translations` | 인식 단어 저장 및 문장 생성 |
| GET | `/api/translations/{sessionId}` | 번역 결과 조회 |

## 실행 방법

### 1. MySQL 준비

기본 설정은 다음과 같습니다.

```text
database: signlanguage
username: signlanguage
password: 빈 값
```

다른 설정을 사용하려면 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
환경변수를 지정합니다.

### 2. Spring Boot 실행

FFprobe와 Gemini API 키가 필요합니다.

```bash
export GEMINI_API_KEY='your-api-key'
cd backend/signlanguage
./gradlew bootRun
```

기본 주소는 `http://localhost:8080`입니다.

### 3. Python AI 서버 실행

프로젝트 루트에서 실행합니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r ai-server/requirements.txt
python -m uvicorn api.main:app --reload --app-dir ai-server
```

기본 주소는 `http://localhost:8000`, Swagger 문서는
`http://localhost:8000/docs`입니다.

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 열고 카메라 권한을 허용합니다.

## 기준 샘플 평가

```bash
source .venv/bin/activate
python ai-server/evaluate_references.py
```

2026년 10월 7일에 기존 촬영본을 정리하고 기준 샘플을 새로
수집하기 시작했습니다. 현재 활성 기준 샘플은 0개이며, 이전 샘플은 Git
기록(커밋 `529ef5e`)에 남아 있습니다. 과거 27개 샘플의 내부 교차 검증
결과(27/27)는 새 데이터의 성능을 나타내지 않습니다. 새 기준 데이터와 별도 시험 데이터를 모은 뒤 다시 평가해야
합니다.

다양한 사용자, 촬영 각도, 조명과 동작 속도를 포함한 별도의 검증
데이터가 필요합니다.

## 향후 개선 사항

- 다양한 사용자와 환경의 기준 샘플 추가
- 학습·검증 데이터 분리 및 실제 인식률 측정
- 미등록 동작 거부 임계값 재조정
- 비슷한 수어를 구분하기 위한 특징 강화
- 자연스러운 연속 수어의 자동 구간 분리 개선
- 프론트엔드 분석 영상과 백엔드 영상 저장 기능 연결
- 사용자별 번역 기록 및 인증 기능
- 배포 환경과 통합 실행 구성
