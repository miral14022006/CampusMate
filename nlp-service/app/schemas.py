from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class EntityItem(BaseModel):
    label: str = Field(..., example="SEMESTER")
    text: str = Field(..., example="5th sem")
    start: int
    end: int

class ChunkItem(BaseModel):
    chunk_id: str
    doc_name: str
    page: int
    score: float
    text: str

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000, example="Exam form bharne ki last date kab hai?")
    language_override: Optional[str] = Field(None, example="hi-Latn")
    session_id: Optional[str] = Field(None, example="sess_user_123")
    dialogue_state: Optional[Dict[str, Any]] = None

class AnalyzeResponse(BaseModel):
    request_id: str
    raw_query: str
    normalized_query: str
    tokens: List[str]
    detected_language: str
    script: str
    language_confidence: float
    intent: str
    intent_confidence: float
    is_fallback_intent: bool
    entities: List[EntityItem]
    retrieved_chunks: List[ChunkItem]
    decision: Optional[str] = "ANSWER"
    decision_reason: Optional[str] = "ANSWERED"
    clarification_question: Optional[str] = None
    quick_replies: Optional[List[Dict[str, Any]]] = None
    contact_info: Optional[Dict[str, Any]] = None
    standalone_query: Optional[str] = None
    is_follow_up: Optional[bool] = False
    is_reset: Optional[bool] = False
    dialogue_state: Optional[Dict[str, Any]] = None
    stage_latencies_ms: Dict[str, Any]
    total_latency_ms: float

class CitationSchema(BaseModel):
    citation_id: int
    doc_name: str
    page: int
    snippet: str
    score: float
    upload_date: Optional[str] = "2024-01-01"

class QueryResponse(BaseModel):
    request_id: str
    answer: str
    language: str
    intent: str
    confidence: float
    source_doc: Optional[str]
    citations: Optional[List[CitationSchema]] = Field(default_factory=list)
    grounded: Optional[bool] = True
    generation_mode: Optional[str] = "rag"
    hallucination_score: Optional[float] = 0.0
    entities: List[EntityItem]
    decision: Optional[str] = "ANSWER"
    decision_reason: Optional[str] = "ANSWERED"
    clarification_question: Optional[str] = None
    quick_replies: Optional[List[Dict[str, Any]]] = None
    contact_info: Optional[Dict[str, Any]] = None
    standalone_query: Optional[str] = None
    is_follow_up: Optional[bool] = False
    is_reset: Optional[bool] = False
    dialogue_state: Optional[Dict[str, Any]] = None
    calendar_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    analysis: Optional[AnalyzeResponse] = None
    execution_time_ms: float

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    models_loaded: bool

class VersionResponse(BaseModel):
    service: str
    version: str
    api_prefix: str
    active_features: Dict[str, Any]
