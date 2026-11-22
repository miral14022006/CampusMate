from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LanguageDetectRequest(BaseModel):
    text: str

class LanguageDetectResponse(BaseModel):
    language: str  # "en", "hi", "gu", "hinglish", "gujlish", "mixed", "unknown"
    script: str    # "latin", "devanagari", "gujarati", "mixed"
    confidence: float
    detected_tokens: List[str] = []

class PreprocessRequest(BaseModel):
    text: str
    language: Optional[str] = "en"

class PreprocessResponse(BaseModel):
    original_text: str
    normalized_text: str
    tokens: List[str]
    clean_tokens: List[str]

class IntentClassifyRequest(BaseModel):
    query: str
    language: Optional[str] = "en"

class IntentClassifyResponse(BaseModel):
    intent: str
    confidence: float
    method: str = "tfidf_logistic_regression"

class EntityExtractRequest(BaseModel):
    text: str

class EntityExtractResponse(BaseModel):
    course: Optional[str] = None
    branch: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    exam_type: Optional[str] = None
    academic_year: Optional[int] = None
    dates: List[str] = []
    entities: Dict[str, Any] = {}

class Citation(BaseModel):
    citation_id: int
    doc_name: str
    page: int
    snippet: str
    score: float = 0.0

class ChunkMetadata(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    page_number: int
    content: str
    language: str = "en"
    document_version: int = 1
    created_at: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4
    method: Optional[str] = "hybrid"  # "tfidf", "bm25", "dense", "hybrid"

class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    doc_name: str
    page: int
    content: str
    score: float

class SearchResponse(BaseModel):
    query: str
    method: str
    count: int
    results: List[SearchResultItem]

class ChatRequest(BaseModel):
    query: str
    sessionId: Optional[str] = None
    dialogue_state: Optional[Dict[str, Any]] = None
    preferred_mode: Optional[str] = "rag"  # "rag" or "extractive"

class ChatResponse(BaseModel):
    answer: str
    reply: str
    language: str
    intent: str
    confidence: float
    source_doc: Optional[str] = None
    entities: List[Dict[str, Any]] = []
    citations: List[Citation] = []
    calendar_events: List[Dict[str, Any]] = []
    grounded: bool = True
    generation_mode: str = "rag"
    hallucination_score: float = 0.0
    decision: str = "ANSWER"
    decision_reason: str = "ANSWERED"
    clarification_question: Optional[str] = None
    quick_replies: List[str] = []
    dialogue_state: Optional[Dict[str, Any]] = None
    execution_time_ms: float = 0.0
