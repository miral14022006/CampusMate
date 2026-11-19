import json
import joblib
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi

from features.f01_hybrid_retrieval.base import BaseRetriever
from app.core.config import DATA_DIR, INDEX_DIR
from app.modules.preprocessing import preprocessor

BM25_INDEX_PATH = INDEX_DIR / "bm25_index.joblib"

class BM25Retriever(BaseRetriever):
    def __init__(self):
        self.bm25 = None
        self.chunks: List[Dict[str, Any]] = []
        self.load_index()

    @property
    def name(self) -> str:
        return "bm25"

    def build_index(self):
        chunks_file = DATA_DIR / "processed" / "chunks.json"
        if not chunks_file.exists():
            from app.modules.ingest import ingester
            self.chunks = ingester.process_all_raw_docs()
        else:
            with open(chunks_file, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)

        if not self.chunks:
            return

        tokenized_corpus = []
        for c in self.chunks:
            norm_text = preprocessor.normalize_variants(preprocessor.normalize(c["text"]))
            tokens = preprocessor.tokenize(norm_text.lower())
            tokenized_corpus.append(tokens)

        self.bm25 = BM25Okapi(tokenized_corpus)

        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"bm25": self.bm25, "chunks": self.chunks}, BM25_INDEX_PATH)

    def load_index(self):
        if BM25_INDEX_PATH.exists():
            try:
                data = joblib.load(BM25_INDEX_PATH)
                self.bm25 = data["bm25"]
                self.chunks = data["chunks"]
            except Exception:
                self.build_index()
        else:
            self.build_index()

    def retrieve(self, query: str, top_k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        if self.bm25 is None or not self.chunks:
            return []

        norm_query = preprocessor.normalize_variants(preprocessor.normalize(query))
        query_tokens = preprocessor.tokenize(norm_query.lower())
        if not query_tokens:
            return []

        scores = self.bm25.get_scores(query_tokens)
        top_indices = scores.argsort()[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            c = self.chunks[idx]
            results.append({
                "chunk_id": c["chunk_id"],
                "doc_name": c["doc_name"],
                "page": c["page"],
                "score": round(score, 4),
                "text": c["text"]
            })
        return results

bm25_retriever = BM25Retriever()

