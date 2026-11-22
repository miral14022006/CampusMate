import os
import logging
from typing import List, Dict, Any
from app.modules.preprocessing import preprocessor

logger = logging.getLogger("nlp_service.reranker")

CROSS_ENCODER_MODEL = os.getenv("RERANKER_MODEL_NAME", "cross-encoder/ms-marco-MiniLM-L-6-v2")

class MultilingualReranker:
    def __init__(self, model_name: str = CROSS_ENCODER_MODEL, enabled: bool = True):
        self.model_name = model_name
        self.enabled = enabled
        self.model = None
        self._init_model()

    def _init_model(self):
        if not self.enabled:
            return
        try:
            from sentence_transformers import CrossEncoder
            self.model = CrossEncoder(self.model_name)
            logger.info(f"Loaded Cross-Encoder Reranker: {self.model_name}")
        except Exception as e:
            logger.warning(f"CrossEncoder unavailable: {e}. Using token-overlap scoring fallback.")
            self.model = None

    def rerank(self, query: str, candidates: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        if not self.enabled:
            return candidates[:top_n]

        if self.model:
            pairs = [[query, c["text"]] for c in candidates]
            scores = self.model.predict(pairs)
            scored_candidates = []
            for score, cand in zip(scores, candidates):
                item = dict(cand)
                item["rerank_score"] = round(float(score), 4)
                scored_candidates.append(item)
            scored_candidates.sort(key=lambda x: x["rerank_score"], reverse=True)
            return scored_candidates[:top_n]

        # Robust extractive token-overlap fallback
        q_tokens = set(preprocessor.tokenize(query.lower()))
        scored = []
        for c in candidates:
            c_tokens = set(preprocessor.tokenize(c["text"].lower()))
            overlap = len(q_tokens.intersection(c_tokens))
            item = dict(c)
            # Combine initial retrieval score with overlap density
            item["rerank_score"] = round(c.get("score", 0.0) + (overlap * 0.05), 4)
            scored.append(item)

        scored.sort(key=lambda x: x["rerank_score"], reverse=True)
        return scored[:top_n]

reranker = MultilingualReranker()

