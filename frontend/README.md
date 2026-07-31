# Frontend

React와 Vite로 만든 의료 수어 촬영 화면이다. 브라우저 카메라 영상을 메모리에서 녹화한 뒤 Python 분석 API로 전송하며, 영상 파일은 사용자 기기에 저장하지 않는다.

## 실행

먼저 Python 분석 API를 `http://localhost:8000`에서, Spring Boot를
`http://localhost:8080`에서 실행한다.

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 연 뒤 카메라 권한을 허용한다.

- `한 단어`: 촬영 영상 전체를 단어 하나로 분석한다.
- `연속 단어`: 단어 사이에 약 0.8초 정지한 영상을 최대 5개 단어로 나눠 분석한다.

API 주소를 변경하려면 `.env`에 다음 값을 설정한다.

```text
VITE_AI_API_URL=http://localhost:8000
VITE_BACKEND_API_URL=http://localhost:8080
```

수어 분석 후 인식된 단어를 확인하고 `자연스러운 문장 만들기` 버튼을
누르면 Spring Boot가 Gemini API를 호출한다. 생성 문장과 인식 단어는
MySQL에 함께 저장된다.
