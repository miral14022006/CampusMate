import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class PipelineContext(BaseModel):
    request_id: str = ""
    raw_query: str = ""
    normalized_query: str = ""
    tokens: List[str] = Field(default_factory=list)
    language_override: Optional[str] = None
    language: str = "en"
    script: str = "Latin"
    language_confidence: float = 1.0
    intent: str = "out_of_scope"
    intent_confidence: float = 0.0
    is_fallback_intent: bool = False
    entities: List[Dict[str, Any]] = Field(default_factory=list)
    retrieved_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    answer: str = ""
    source_doc: Optional[str] = None
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    calendar_events: List[Dict[str, Any]] = Field(default_factory=list)
    grounded: bool = True
    generation_mode: str = "rag"
    hallucination_score: float = 0.0
    decision: str = "ANSWER"
    decision_reason: str = "ANSWERED"
    clarification_question: Optional[str] = None
    quick_replies: List[Dict[str, Any]] = Field(default_factory=list)
    contact_info: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    dialogue_state: Optional[Dict[str, Any]] = None
    standalone_query: Optional[str] = None
    is_follow_up: bool = False
    is_reset: bool = False
    stage_latencies_ms: Dict[str, Any] = Field(default_factory=dict)
    total_latency_ms: float = 0.0

class PipelineStage(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the pipeline stage."""
        pass

    @abstractmethod
    def run(self, context: PipelineContext) -> PipelineContext:
        """Executes stage logic and modifies context."""
        pass

    def execute(self, context: PipelineContext) -> PipelineContext:
        """Timing decorator around stage execution."""
        t0 = time.perf_counter()
        context = self.run(context)
        elapsed = (time.perf_counter() - t0) * 1000
        context.stage_latencies_ms[self.name] = round(elapsed, 3)
        return context
