from fastapi import APIRouter
from pydantic import BaseModel
from features.language_detector.detector import LanguageDetector
from config.settings import is_feature_enabled

router = APIRouter(prefix="/language", tags=["Language Detection"])

class LanguageDetectRequest(BaseModel):
    text: str

class LanguageDetectResponse(BaseModel):
    language: str
    confidence: float
    is_transliterated: bool
    feature_enabled: bool

@router.post("/detect", response_model=LanguageDetectResponse)
def detect_language_endpoint(request: LanguageDetectRequest):
    enabled = is_feature_enabled("multilingual_detection", default=True)
    if not enabled:
        # Baseline fallback when flag is off: always returns standard English baseline
        return LanguageDetectResponse(
            language="en",
            confidence=1.0,
            is_transliterated=False,
            feature_enabled=False
        )

    res = LanguageDetector.detect(request.text)
    return LanguageDetectResponse(
        language=res["language"],
        confidence=res["confidence"],
        is_transliterated=res["is_transliterated"],
        feature_enabled=True
    )

