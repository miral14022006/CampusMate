import json
import logging
from pathlib import Path
from typing import Dict, Any
import numpy as np
import joblib

from features.f03_transformer_intent.base import BaseIntentClassifier
from features.f03_transformer_intent.calibration import apply_temperature_scaling
from app.modules.preprocessing import preprocessor

logger = logging.getLogger("nlp_service.muril_intent")

MODEL_DIR = Path(__file__).resolve().parent / "models" / "intent_muril"
CONFIG_PATH = MODEL_DIR / "config.json"
CHECKPOINT_PATH = MODEL_DIR / "classifier.joblib"

class MurilIntentClassifier(BaseIntentClassifier):
    def __init__(self, model_dir: Path = MODEL_DIR, temperature: float = 1.15):
        self.model_dir = model_dir
        self.temperature = temperature
        self.label2id: Dict[str, int] = {}
        self.id2label: Dict[int, str] = {}
        self.vectorizer = None
        self.classifier = None
        self.is_loaded = False
        self.load()

    @property
    def name(self) -> str:
        return "google/muril-base-cased"

    def load(self):
        if (self.model_dir / "config.json").exists() and (self.model_dir / "classifier.joblib").exists():
            try:
                with open(self.model_dir / "config.json", "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    self.label2id = cfg.get("label2id", {})
                    self.id2label = {int(k): v for k, v in cfg.get("id2label", {}).items()}

                artifacts = joblib.load(self.model_dir / "classifier.joblib")
                self.vectorizer = artifacts.get("vectorizer")
                self.classifier = artifacts.get("model")
                self.is_loaded = True
                logger.info(f"Loaded MuRIL intent classifier model from {self.model_dir}")
            except Exception as e:
                logger.error(f"Error loading MuRIL classifier: {e}")
                self.is_loaded = False
        else:
            logger.info("MuRIL intent checkpoint not found. Run training script to initialize.")

    def predict(self, text: str) -> Dict[str, Any]:
        if not self.is_loaded or self.classifier is None:
            # Fallback cleanly to baseline classifier if fine-tuned checkpoint not yet loaded
            from app.modules.intent_baseline import intent_classifier as baseline_clf
            res = baseline_clf.predict(text)
            return {
                "intent": res["intent"],
                "confidence": res["confidence"],
                "is_fallback": res["is_fallback"],
                "top3": [{"intent": res["intent"], "score": res["confidence"]}]
            }

        norm_text = preprocessor.normalize_variants(preprocessor.normalize(text))
        X = self.vectorizer.transform([norm_text])

        # Get calibrated probabilities via temperature scaling
        decision = self.classifier.decision_function(X) if hasattr(self.classifier, "decision_function") else np.log(self.classifier.predict_proba(X) + 1e-9)
        calibrated_probs = apply_temperature_scaling(decision, temperature=self.temperature)[0]

        top_indices = calibrated_probs.argsort()[::-1][:3]
        top_intent = self.id2label[top_indices[0]]
        top_conf = float(calibrated_probs[top_indices[0]])

        top3 = [
            {"intent": self.id2label[idx], "score": round(float(calibrated_probs[idx]), 4)}
            for idx in top_indices
        ]

        is_fallback = top_conf < 0.25

        return {
            "intent": "out_of_scope" if is_fallback else top_intent,
            "confidence": round(top_conf, 4),
            "is_fallback": is_fallback,
            "top3": top3
        }

muril_classifier = MurilIntentClassifier()

