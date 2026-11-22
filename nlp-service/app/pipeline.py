import time
import json
from typing import List, Optional

from app.core.config import FEATURES_CONFIG_PATH
from app.core.logging_config import structured_logger
from app.core.metrics import metrics
from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.pipeline_stages.language_stage import LanguageStage
from app.pipeline_stages.transliteration_stage import TransliterationStage
from app.pipeline_stages.intent_stage import IntentStage
from app.pipeline_stages.entity_stage import EntityStage
from app.pipeline_stages.dialogue_stage import DialogueStateStage
from app.pipeline_stages.retrieval_stage import RetrievalStage
from app.pipeline_stages.clarification_stage import ClarificationStage
from app.pipeline_stages.answer_stage import AnswerStage

class ModularPipeline:
    def __init__(self):
        self.stages: List[PipelineStage] = []
        self.reload_stages_from_features()

    def reload_stages_from_features(self):
        """Loads and configures pipeline stages dynamically based on features.json."""
        flags = {}
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
            except Exception as e:
                structured_logger.error(f"Error reading features.json: {e}")

        # Core Stage Pipeline sequence
        stages: List[PipelineStage] = []
        stages.append(LanguageStage())
        stages.append(TransliterationStage())
        stages.append(IntentStage())
        stages.append(EntityStage())

        if flags.get("dialogue_state", True):
            stages.append(DialogueStateStage())

        if flags.get("rag_retrieval", True):
            stages.append(RetrievalStage())

        if flags.get("clarification_fallback", True):
            stages.append(ClarificationStage())

        stages.append(AnswerStage())

        self.stages = stages
        structured_logger.info(f"Initialized Pipeline with {len(self.stages)} stages: {[s.name for s in self.stages]}")

    def execute(
        self,
        raw_query: str,
        language_override: Optional[str] = None,
        request_id: str = "",
        session_id: Optional[str] = None,
        dialogue_state: Optional[dict] = None,
        conversation_history: Optional[List[dict]] = None
    ) -> PipelineContext:
        ctx = PipelineContext(
            request_id=request_id,
            raw_query=raw_query,
            language_override=language_override,
            session_id=session_id,
            dialogue_state=dialogue_state,
            conversation_history=conversation_history or []
        )

        t0 = time.perf_counter()

        for stage in self.stages:
            ctx = stage.execute(ctx)

        total_elapsed = (time.perf_counter() - t0) * 1000
        ctx.total_latency_ms = round(total_elapsed, 3)

        # Record metrics
        metrics.record_query(ctx.intent, ctx.language, ctx.total_latency_ms)

        # Structured JSON Log
        structured_logger.info(
            f"Query processed: '{raw_query[:50]}...'",
            extra={
                "request_id": ctx.request_id,
                "stage_latencies": ctx.stage_latencies_ms,
                "query_metadata": {
                    "language": ctx.language,
                    "intent": ctx.intent,
                    "confidence": ctx.intent_confidence,
                    "total_ms": ctx.total_latency_ms
                }
            }
        )

        return ctx

    def analyze(
        self,
        raw_query: str,
        language_override: Optional[str] = None,
        request_id: str = "",
        session_id: Optional[str] = None,
        dialogue_state: Optional[dict] = None,
        conversation_history: Optional[List[dict]] = None
    ) -> PipelineContext:
        """Executes intermediate stages up to retrieval without answer generation."""
        ctx = PipelineContext(
            request_id=request_id,
            raw_query=raw_query,
            language_override=language_override,
            session_id=session_id,
            dialogue_state=dialogue_state,
            conversation_history=conversation_history or []
        )

        t0 = time.perf_counter()

        for stage in self.stages:
            if stage.name == "answer_generation":
                continue
            ctx = stage.execute(ctx)

        total_elapsed = (time.perf_counter() - t0) * 1000
        ctx.total_latency_ms = round(total_elapsed, 3)

        metrics.record_analyze()

        return ctx

pipeline = ModularPipeline()
