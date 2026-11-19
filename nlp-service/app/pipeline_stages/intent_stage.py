import json

from app.pipeline_stages.base import PipelineStage, PipelineContext
from app.core.config import FEATURES_CONFIG_PATH
from app.modules.intent_baseline import intent_classifier as baseline_clf
from features.f03_transformer_intent.inference import muril_classifier

class IntentStage(PipelineStage):
    """
    Feature 03: Intent Classification Stage.
    Swappable classifier:
    - 'muril': Fine-tuned Google MuRIL transformer classifier with temperature calibration & top-3 rankings.
    - 'baseline': TF-IDF + Logistic Regression baseline.
    Configured dynamically via 'intent_model' in features.json.
    """
    @property
    def name(self) -> str:
        return "intent_classification"

    def get_configured_classifier(self):
        method = "muril"
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
                    method = flags.get("intent_model", "muril")
            except Exception:
                pass

        if method == "muril" and muril_classifier.is_loaded:
            return muril_classifier
        return baseline_clf

    def run(self, context: PipelineContext) -> PipelineContext:
        query_to_classify = context.normalized_query or context.raw_query
        clf = self.get_configured_classifier()
        res = clf.predict(query_to_classify)

        context.intent = res["intent"]
        context.intent_confidence = res["confidence"]
        context.is_fallback_intent = res["is_fallback"]

        # Store top-3 candidates in stage latency/metadata dict if available
        if "top3" in res:
            context.stage_latencies_ms["top3_intents"] = res["top3"]

        return context
