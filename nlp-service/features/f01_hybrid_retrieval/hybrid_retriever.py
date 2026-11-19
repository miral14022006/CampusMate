import os
from typing import List, Dict, Any

from features.f01_hybrid_retrieval.base import BaseRetriever
from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
from features.f01_hybrid_retrieval.dense_retriever import dense_retriever
from features.f01_hybrid_retrieval.rrf import reciprocal_rank_fusion
from features.f01_hybrid_retrieval.reranker import reranker
from app.modules.retrieval_tfidf import retriever as tfidf_retriever

class HybridRetriever(BaseRetriever):
    def __init__(
        self,
        bm25_weight: float = 1.0,
        dense_weight: float = 1.0,
        rrf_k: int = 60,
        use_reranker: bool = True
    ):
        self.bm25_weight = float(os.getenv("RRF_BM25_WEIGHT", str(bm25_weight)))
        self.dense_weight = float(os.getenv("RRF_DENSE_WEIGHT", str(dense_weight)))
        self.rrf_k = int(os.getenv("RRF_K", str(rrf_k)))
        self.use_reranker = os.getenv("ENABLE_RERANKER", "true").lower() == "true" and use_reranker

    @property
    def name(self) -> str:
        return "hybrid_rrf_rerank" if self.use_reranker else "hybrid_rrf"

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # Step 1: Retrieve top-20 candidates from BM25 and Dense
        bm25_hits = bm25_retriever.retrieve(query, top_k=20)
        dense_hits = dense_retriever.retrieve(query, top_k=20)

        # Step 2: Reciprocal Rank Fusion
        fused = reciprocal_rank_fusion(
            [bm25_hits, dense_hits],
            weights=[self.bm25_weight, self.dense_weight],
            k=self.rrf_k
        )

        # Step 3: Optional Cross-Encoder Reranking
        if self.use_reranker:
            return reranker.rerank(query, fused[:20], top_n=top_k)

        return fused[:top_k]

hybrid_retriever = HybridRetriever(use_reranker=False)
hybrid_rerank_retriever = HybridRetriever(use_reranker=True)

def get_retriever(retriever_type: str = "hybrid") -> BaseRetriever:
    """Factory selecting swappable retriever via string config."""
    t = retriever_type.lower()
    if t == "tfidf":
        return tfidf_retriever
    elif t == "bm25":
        return bm25_retriever
    elif t == "dense":
        return dense_retriever
    elif t == "hybrid":
        return hybrid_retriever
    elif t in ["hybrid_rerank", "hybrid+rerank"]:
        return hybrid_rerank_retriever
    else:
        return hybrid_retriever

