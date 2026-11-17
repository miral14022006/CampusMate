import json
from pathlib import Path
from typing import Dict, Any, List

from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.core.config import FEATURES_CONFIG_PATH
from features.f05_clarification.policy import decision_policy

class ClarificationStage(PipelineStage):
    """
    Feature 05: Confidence-Based Fallback & Clarification Stage.
    Consumes top intent confidences, entity completeness, and retrieval scores
    to make an ANSWER, CLARIFY, or FALLBACK decision.
    """
    @property
    def name(self) -> str:
        return "clarification_decision"

    def _is_enabled(self) -> bool:
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
                    return flags.get("clarification_fallback", True)
            except Exception:
                pass
        return True

    def run(self, context: PipelineContext) -> PipelineContext:
        if not self._is_enabled():
            context.decision = "ANSWER"
            return context

        # Prepare top intents list
        top_intents: List[Dict[str, Any]] = []
        if "top3_intents" in context.stage_latencies_ms and isinstance(context.stage_latencies_ms["top3_intents"], list):
            top_intents = context.stage_latencies_ms["top3_intents"]
        else:
            top_intents = [{"intent": context.intent, "confidence": context.intent_confidence}]

        # Evaluate policy
        eval_result = decision_policy.evaluate(
            top_intents=top_intents,
            entities=context.entities,
            retrieved_chunks=context.retrieved_chunks,
            language=context.language
        )

        context.decision = eval_result["decision"]
        context.clarification_question = eval_result.get("clarification_question")
        context.quick_replies = eval_result.get("quick_replies", [])
        context.contact_info = eval_result.get("contact_info")

        return context

