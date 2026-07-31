# Sign Language Backend

수어 원본 영상과 메타데이터를 관리하는 Spring Boot API다.

## 실행 환경

- Java 21
- MySQL 8
- FFmpeg 8 (`ffprobe`)

## 데이터베이스 준비

MySQL에서 애플리케이션용 데이터베이스와 사용자를 만든다.

```sql
CREATE DATABASE signlanguage
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'signlanguage'@'localhost' IDENTIFIED BY '변경할-비밀번호';
GRANT ALL PRIVILEGES ON signlanguage.* TO 'signlanguage'@'localhost';
FLUSH PRIVILEGES;
```

비밀번호와 Gemini API 키는 Git에 저장하지 않고 실행 환경변수로 전달한다.

```bash
export DB_USERNAME=signlanguage
export DB_PASSWORD='변경할-비밀번호'
export GEMINI_API_KEY='Google-AI-Studio에서-발급한-키'
```

필요하면 접속 URL과 영상 저장 경로도 변경할 수 있다.

```bash
export DB_URL='jdbc:mysql://localhost:3306/signlanguage?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
export UPLOAD_DIR='../../uploads'
```

## 빌드 및 실행

```bash
./gradlew clean test
./gradlew bootRun
```

애플리케이션이 시작될 때 Flyway가 다음 테이블을 생성한다.

- `sign_video`: 업로드 영상 메타데이터
- `sign_word`: 수어 단어 ID, 한글 라벨, 의미 분류와 촬영 키
- `translation_session`: 번역 요청과 생성 문장
- `recognized_word`: 번역 요청에 포함된 인식 단어 순서

활성화된 단어 사전은 다음 API로 조회한다.

```bash
curl http://localhost:8080/api/sign-words
```

Python 분석 서버는 시작할 때 이 API에서 단어 목록을 동기화한다.

## 영상 업로드

지원 형식은 MP4, MOV, WEBM이며 최대 크기는 500MB다.

```bash
curl -X POST http://localhost:8080/api/videos \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/absolute/path/sample.mp4'
```

성공하면 HTTP `201 Created`와 저장된 메타데이터가 반환된다. 실제 파일은 UUID 파일명으로 `uploads/`에 저장된다.

업로드 시 `ffprobe`로 재생시간을 확인해 `durationMs`에 저장한다. 저장된 영상 메타데이터는 다음 API로 조회할 수 있다.

```bash
curl http://localhost:8080/api/videos/1
```

## 번역 세션 생성

인식된 단어는 1개 이상 5개 이하로 전달한다. Gemini API가 단어 목록을
환자의 자연스러운 한국어 문장으로 변환한다. 생성에 성공하면 문장과
`COMPLETED` 상태를, API 호출에 실패하면 `FAILED` 상태를 저장한다.

```bash
curl -X POST http://localhost:8080/api/translations \
  -H 'Content-Type: application/json' \
  -d '{
    "words": [
      {
        "wordId": "sick",
        "wordLabel": "아프다",
        "confidence": 0.83
      },
      {
        "wordId": "hospital",
        "wordLabel": "병원",
        "confidence": 0.82
      }
    ]
  }'
```

생성된 세션은 다음 API로 조회한다.

```bash
curl http://localhost:8080/api/translations/1
```
