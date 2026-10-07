from typing import Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    referenceCount: int


class WordResponse(BaseModel):
    wordId: str
    wordLabel: str


class WordsResponse(BaseModel):
    words: list[WordResponse]


class AnalysisWordResponse(BaseModel):
    wordId: Optional[str]
    wordLabel: str
    distance: float
    confidence: float
    frameCount: int


class TimedWordResponse(AnalysisWordResponse):
    segmentIndex: int
    startMs: int
    endMs: int


class AnalysisResponse(BaseModel):
    words: list[TimedWordResponse]
    segmentCount: int
    frameCount: int
