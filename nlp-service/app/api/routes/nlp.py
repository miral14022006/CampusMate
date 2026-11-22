from fastapi import APIRouter
from app.models.schemas import (
    LanguageDetectRequest, LanguageDetectResponse,
    PreprocessRequest, PreprocessResponse,
    IntentClassifyRequest, IntentClassifyResponse,
    EntityExtractRequest, EntityExtractResponse
)
from app.nlp.language_detection import detect_language
from app.nlp.preprocessing import clean_text, normalize_slang, tokenize, remove_stopwords
from app.nlp.intent_classifier import intent_classifier
from app.nlp.entity_extraction import extract_entities

router = APIRouter(prefix="/v1/nlp", tags=["NLP"])

@router.post("/detect-language", response_model=LanguageDetectResponse)
def detect_lang_endpoint(req: LanguageDetectRequest):
    res = detect_language(req.text)
    return LanguageDetectResponse(**res)

@router.post("/preprocess", response_model=PreprocessResponse)
def preprocess_endpoint(req: PreprocessRequest):
    clean = clean_text(req.text)
    norm = normalize_slang(clean)
    tokens = tokenize(norm)
    clean_toks = remove_stopwords(tokens, language=req.language or "en")
    return PreprocessResponse(
        original_text=req.text,
        normalized_text=norm,
        tokens=tokens,
        clean_tokens=clean_toks
    )

@router.post("/classify-intent", response_model=IntentClassifyResponse)
def classify_intent_endpoint(req: IntentClassifyRequest):
    res = intent_classifier.classify(req.query)
    return IntentClassifyResponse(**res)

@router.post("/extract-entities", response_model=EntityExtractResponse)
def extract_entities_endpoint(req: EntityExtractRequest):
    res = extract_entities(req.text)
    return EntityExtractResponse(**res)
