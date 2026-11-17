import json
from pathlib import Path
from typing import Dict, Any, Optional

from app.pipeline_stages.base import PipelineStage, PipelineContext
from features.f01_hybrid_retrieval.hybrid_retriever import get_retriever
from app.core.config import RETRIEVAL_TOP_K, FEATURES_CONFIG_PATH

class RetrievalStage(PipelineStage):
    """
    Feature 01: Retrieval Stage.
    Swappable retrieval supporting:
    - 'tfidf'
    - 'bm25'
    - 'dense'
    - 'hybrid' (BM25 + Dense RRF)
    - 'hybrid_rerank' (BM25 + Dense RRF + Cross-Encoder Reranker)
    Configurable via 'retrieval_method' in features.json.
    """
    @property
    def name(self) -> str:
        return "document_retrieval"

    def get_configured_retriever(self):
        method = "hybrid_rerank"
        if FEATURES_CONFIG_PATH.exists():
            try:
                with open(FEATURES_CONFIG_PATH, "r", encoding="utf-8") as f:
                    flags = json.load(f)
                    method = flags.get("retrieval_method", "hybrid_rerank")
            except Exception:
                pass
        return get_retriever(method)

    def run(self, context: PipelineContext) -> PipelineContext:
        query_text = context.normalized_query or context.raw_query
        retriever = self.get_configured_retriever()
        hits = retriever.retrieve(query_text, top_k=RETRIEVAL_TOP_K)
        context.retrieved_chunks = hits
        return context
