from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.retrieval.bm25_retriever import bm25_retriever
from app.retrieval.dense_retriever import dense_retriever
from app.retrieval.tfidf_retriever import tfidf_retriever
from app.core.logging import logger

class HybridRetriever:
    def __init__(self):
        self.reranker = None

    def _get_reranker(self):
        if self.reranker is None and settings.ENABLE_RERANKER:
            try:
                from sentence_transformers import CrossEncoder
                logger.info(f"Loading CrossEncoder Reranker: {settings.RERANKER_MODEL}")
                self.reranker = CrossEncoder(settings.RERANKER_MODEL)
            except Exception as e:
                logger.warning(f"Could not load CrossEncoder: {e}. Proceeding with pure RRF.")
        return self.reranker

    def search(
        self,
        query: str,
        top_k: int = 4,
        method: str = "hybrid",
        dual_form_query: str = None
    ) -> List[Tuple[Dict[str, Any], float]]:
        """
        Unified search interface supporting:
        - "tfidf": baseline TF-IDF cosine similarity
        - "bm25": BM25 sparse keyword search
        - "dense": FAISS multilingual dense search
        - "hybrid": Reciprocal Rank Fusion (RRF) + Cross-Encoder reranking
        """
        search_query = dual_form_query or query

        if method == "tfidf":
            return tfidf_retriever.search(search_query, top_k=top_k)
        elif method == "bm25":
            return bm25_retriever.search(search_query, top_k=top_k)
        elif method == "dense":
            return dense_retriever.search(search_query, top_k=top_k)

        # Hybrid: Dense + BM25 + Reciprocal Rank Fusion (RRF)
        bm25_results = bm25_retriever.search(search_query, top_k=15)
        dense_results = dense_retriever.search(search_query, top_k=15)

        rrf_scores: Dict[str, float] = {}
        chunk_map: Dict[str, Dict[str, Any]] = {}
        k = settings.RRF_K

        # BM25 RRF scoring
        for rank, (chunk, _) in enumerate(bm25_results):
            cid = chunk["chunk_id"]
            chunk_map[cid] = chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + settings.BM25_WEIGHT * (1.0 / (k + rank + 1))

        # Dense RRF scoring
        for rank, (chunk, _) in enumerate(dense_results):
            cid = chunk["chunk_id"]
            chunk_map[cid] = chunk
            rrf_scores[cid] = rrf_scores.get(cid, 0.0) + settings.DENSE_WEIGHT * (1.0 / (k + rank + 1))

        # Sort candidate pool
        sorted_candidates = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:10]
        if not sorted_candidates:
            # Fallback to TF-IDF if both returned empty
            return tfidf_retriever.search(search_query, top_k=top_k)

        candidate_chunks = [chunk_map[cid] for cid, _ in sorted_candidates]

        # Cross-Encoder Reranking
        reranker = self._get_reranker()
        if reranker and candidate_chunks:
            pairs = [[query, c["content"]] for c in candidate_chunks]
            cross_scores = reranker.predict(pairs)
            ranked_indices = sorted(range(len(cross_scores)), key=lambda i: cross_scores[i], reverse=True)[:top_k]
            return [(candidate_chunks[i], float(cross_scores[i])) for i in ranked_indices]

        # Pure RRF ranking fallback
        return [(chunk_map[cid], rrf_scores[cid]) for cid, _ in sorted_candidates[:top_k]]

hybrid_retriever = HybridRetriever()
