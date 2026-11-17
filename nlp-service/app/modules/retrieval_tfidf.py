import json
import joblib
from pathlib import Path
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from features.f01_hybrid_retrieval.base import BaseRetriever

from app.core.config import (
    RETRIEVAL_INDEX_PATH,
    DATA_DIR,
    INDEX_DIR,
    RETRIEVAL_TOP_K
)
from app.modules.preprocessing import preprocessor
from features.f02_transliteration.engine import transliteration_engine

class TfidfRetriever(BaseRetriever):
    def __init__(self):
        self.vectorizer = None
        self.tfidf_matrix = None
        self.chunks: List[Dict[str, Any]] = []
        self.load_index()

    @property
    def name(self) -> str:
        return "tfidf"

    def build_index(self):
        chunks_file = DATA_DIR / "processed" / "chunks.json"
        if not chunks_file.exists():
            from app.modules.ingest import ingester
            self.chunks = ingester.process_all_raw_docs()
        else:
            with open(chunks_file, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)

        if not self.chunks:
            print("[Retriever] Warning: No chunks found to build index.")
            return

        # Dual-sided indexing:
        # Preprocess each chunk, and if it contains Indic script or Roman text,
        # create unified dual representation so Roman queries match Indic docs and vice-versa.
        corpus = []
        for c in self.chunks:
            norm_text = preprocessor.normalize_variants(preprocessor.normalize(c["text"]))
            corpus.append(norm_text)

        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=1
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "vectorizer": self.vectorizer,
            "tfidf_matrix": self.tfidf_matrix,
            "chunks": self.chunks
        }, RETRIEVAL_INDEX_PATH)
        print(f"[Retriever] Saved dual-capable index with {len(self.chunks)} chunks to {RETRIEVAL_INDEX_PATH}")

    def load_index(self):
        if RETRIEVAL_INDEX_PATH.exists():
            try:
                data = joblib.load(RETRIEVAL_INDEX_PATH)
                self.vectorizer = data["vectorizer"]
                self.tfidf_matrix = data["tfidf_matrix"]
                self.chunks = data["chunks"]
            except Exception as e:
                print(f"[Retriever] Error loading index: {e}")
                self.build_index()
        else:
            self.build_index()

    def retrieve(self, query: str, top_k: int = RETRIEVAL_TOP_K) -> List[Dict[str, Any]]:
        if self.vectorizer is None or self.tfidf_matrix is None or not self.chunks:
            return []

        cleaned_query = preprocessor.normalize_variants(preprocessor.normalize(query))
        q_vec = self.vectorizer.transform([cleaned_query])
        scores = cosine_similarity(q_vec, self.tfidf_matrix)[0]

        top_indices = scores.argsort()[::-1][:top_k]
        results = []
        for idx in top_indices:
            score = float(scores[idx])
            chunk = self.chunks[idx]
            results.append({
                "chunk_id": chunk["chunk_id"],
                "doc_name": chunk["doc_name"],
                "page": chunk["page"],
                "score": round(score, 4),
                "text": chunk["text"]
            })

        return results

retriever = TfidfRetriever()
