import os
import joblib
import numpy as np
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.core.config import settings
from app.core.logging import logger

class TfidfRetriever:
    def __init__(self):
        self.model_path = os.path.join(settings.INDEX_DIR, "tfidf_retrieval.joblib")
        self.vectorizer = None
        self.chunk_matrix = None
        self.chunks: List[Dict[str, Any]] = []

    def build_index(self, chunks: List[Dict[str, Any]]):
        """Fit TF-IDF on chunk contents and serialize."""
        self.chunks = chunks
        if not chunks:
            self.vectorizer = None
            self.chunk_matrix = None
            return

        corpus = [c["content"] for c in chunks]
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True)
        self.chunk_matrix = self.vectorizer.fit_transform(corpus)

        joblib.dump({
            "vectorizer": self.vectorizer,
            "chunk_matrix": self.chunk_matrix,
            "chunks": self.chunks
        }, self.model_path)
        logger.info(f"TF-IDF Retriever indexed {len(chunks)} chunks.")

    def load_index(self) -> bool:
        """Load indexed TF-IDF matrix and metadata."""
        if os.path.exists(self.model_path):
            try:
                data = joblib.load(self.model_path)
                self.vectorizer = data["vectorizer"]
                self.chunk_matrix = data["chunk_matrix"]
                self.chunks = data["chunks"]
                return True
            except Exception as e:
                logger.error(f"Failed to load TF-IDF index: {e}")
        return False

    def search(self, query: str, top_k: int = 4) -> List[Tuple[Dict[str, Any], float]]:
        """Compute cosine similarity between query and chunks."""
        if not self.vectorizer or self.chunk_matrix is None or not self.chunks:
            if not self.load_index():
                return []

        q_vec = self.vectorizer.transform([query])
        sims = cosine_similarity(q_vec, self.chunk_matrix)[0]

        top_indices = np.argsort(sims)[::-1][:top_k]
        results = []
        for idx in top_indices:
            score = float(sims[idx])
            if score > 0.001:
                results.append((self.chunks[idx], score))
        return results

tfidf_retriever = TfidfRetriever()
