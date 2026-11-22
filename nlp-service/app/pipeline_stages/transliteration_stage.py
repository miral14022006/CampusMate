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

        query_to_expand = context.normalized_query or context.raw_query

        # 1. Transliterate Romanized dialects
        if context.language in ["hi-Latn", "gu-Latn"]:
            translit_text, dual_form = transliteration_engine.transliterate_text(
                query_to_expand,
                context.language
            )
            context.transliterated_text = translit_text
            context.dual_form = dual_form
            query_to_expand = dual_form

        # 2. Cross-lingual English concept expansion for English document retrieval
        if hasattr(transliteration_engine, "expand_with_english_concepts"):
            expanded_query = transliteration_engine.expand_with_english_concepts(query_to_expand)
            context.normalized_query = expanded_query
        else:
            context.normalized_query = query_to_expand

        return context
