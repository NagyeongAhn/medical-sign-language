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

비밀번호는 Git에 저장하지 않고 실행 환경변수로 전달한다.

```bash
export DB_USERNAME=signlanguage
export DB_PASSWORD='변경할-비밀번호'
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

애플리케이션이 시작될 때 Flyway가 `sign_video` 테이블을 생성한다.

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
