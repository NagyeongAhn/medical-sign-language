import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import (
    AnalysisResponse,
    HealthResponse,
    SequenceAnalysisResponse,
    WordResponse,
    WordsResponse,
)
from comparison.sign_matcher import SignMatcher
from services.recording_service import WORD_DEFINITIONS
from services.video_analysis_service import VideoAnalysisService


BASE_DIRECTORY = Path(__file__).resolve().parents[1]
RECORDINGS_DIRECTORY = BASE_DIRECTORY / "recordings"
ALLOWED_EXTENSIONS = {".webm", ".mp4", ".mov", ".avi"}
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

sign_matcher = SignMatcher(RECORDINGS_DIRECTORY)
reference_count = sign_matcher.load_references()
video_analysis_service = VideoAnalysisService(sign_matcher)

app = FastAPI(
    title="Sign Language Analysis API",
    description="촬영된 수어 영상을 분석해 의료 수어 단어를 반환합니다.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status": "ok",
        "referenceCount": reference_count,
    }


@app.get("/api/sign/words", response_model=WordsResponse)
def get_words():
    words_by_id = {
        word["wordId"]: WordResponse(**word)
        for word in WORD_DEFINITIONS.values()
    }
    return {"words": list(words_by_id.values())}


@app.post("/api/sign/analyze", response_model=AnalysisResponse)
async def analyze_sign(video: UploadFile = File(...)):
    return await _handle_video_upload(video, video_analysis_service.analyze)


@app.post(
    "/api/sign/analyze-sequence",
    response_model=SequenceAnalysisResponse,
)
async def analyze_sign_sequence(video: UploadFile = File(...)):
    return await _handle_video_upload(
        video,
        video_analysis_service.analyze_sequence,
    )


async def _handle_video_upload(video, analyze_method):
    filename = video.filename or ""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="webm, mp4, mov, avi 영상만 업로드할 수 있습니다.",
        )

    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            prefix="sign-upload-",
            suffix=extension,
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            uploaded_size = 0

            while True:
                chunk = await video.read(1024 * 1024)
                if not chunk:
                    break
                uploaded_size += len(chunk)
                if uploaded_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="영상 크기는 50MB 이하여야 합니다.",
                    )
                temporary_file.write(chunk)

        if uploaded_size == 0:
            raise HTTPException(status_code=400, detail="빈 영상 파일입니다.")

        try:
            return analyze_method(temporary_path)
        except ValueError as error:
            print(f"[영상 분석 실패] {error}")
            raise HTTPException(status_code=422, detail=str(error)) from error
    finally:
        await video.close()
        if temporary_path:
            temporary_path.unlink(missing_ok=True)
