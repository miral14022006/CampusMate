import json
from pathlib import Path
from typing import Dict, Any, List

from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.core.config import FEATURES_CONFIG_PATH
from features.f06_dialogue_state.manager import dialogue_manager

class DialogueStateStage(PipelineStage):
    """
    Feature 06: Dialogue State Stage.
    Consumes extracted entities, previous dialogue state, and raw query:
    - Detects follow-ups and resets.
    - Carries over active slots from previous turns.
    - Re-evaluates / inherits intent if follow-up.
    - Produces standalone rewritten query for downstream retrieval.
    """
    @property
    def name(self) -> str:
        return "dialogue_state_tracking"

    def _is_enabled(self) -> bool:
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
                    return flags.get("dialogue_state", True)
            except Exception:
                pass
        return True

    def run(self, context: PipelineContext) -> PipelineContext:
        if not self._is_enabled():
            context.standalone_query = context.raw_query
            return context

        query = context.raw_query
        result = dialogue_manager.process_turn(
            query=query,
            incoming_state=context.dialogue_state,
            detected_intent=context.intent,
            intent_confidence=context.intent_confidence,
            entities=context.entities
        )

        context.is_reset = result["is_reset"]
        context.is_follow_up = result["is_follow_up"]
        context.standalone_query = result["standalone_query"]
        context.dialogue_state = result["updated_state"]

        if result["is_follow_up"]:
            context.intent = result["resolved_intent"]
            context.intent_confidence = result["resolved_confidence"]
            # Also update normalized query for retrieval to use the rewritten query
            context.normalized_query = result["standalone_query"]

        if result["is_reset"]:
            context.intent = "greeting"
            context.intent_confidence = 1.0
            context.answer = "Conversation context has been reset. What would you like to know?"

        return context

