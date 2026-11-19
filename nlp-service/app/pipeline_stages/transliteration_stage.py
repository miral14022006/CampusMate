import json

from app.pipeline_stages.base import PipelineStage, PipelineContext
from features.f02_transliteration.engine import transliteration_engine
from app.core.config import FEATURES_CONFIG_PATH

class TransliterationStage(PipelineStage):
    """
    Feature 02: Transliteration Stage.
    Transliterates romanized Hindi (Hinglish) and Gujarati (Gujlish) to native script
    while keeping technical college English vocabulary intact.
    Produces both native-script text and dual-form for RAG document retrieval.
    """
    @property
    def name(self) -> str:
        return "transliteration"

    def is_feature_active(self) -> bool:
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
                    return flags.get("transliteration", True)
            except Exception:
                pass
        return True

    def run(self, context: PipelineContext) -> PipelineContext:
        if not self.is_feature_active():
            return context

        # Only process romanized code-mixed dialects
        if context.language in ["hi-Latn", "gu-Latn"]:
            translit_text, dual_form = transliteration_engine.transliterate_text(
                context.normalized_query or context.raw_query,
                context.language
            )

            # Store transliterated outputs in context
            context.stage_latencies_ms["transliterated_text"] = translit_text
            context.stage_latencies_ms["dual_form"] = dual_form

            # The dual form is passed to downstream retrieval and intent classification
            # to bridge the vocabulary gap between Devanagari docs and Romanized queries
            context.normalized_query = dual_form

        return context
