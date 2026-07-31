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


class AnalysisResponse(BaseModel):
    wordId: Optional[str]
    wordLabel: str
    distance: float
    confidence: float
    frameCount: int


class SequenceWordResponse(AnalysisResponse):
    segmentIndex: int
    startMs: int
    endMs: int


class SequenceAnalysisResponse(BaseModel):
    words: list[SequenceWordResponse]
    segmentCount: int
    frameCount: int
