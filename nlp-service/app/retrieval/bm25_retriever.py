import os
import pickle
from typing import List, Dict, Any, Tuple
from rank_bm25 import BM25Okapi
from app.core.config import settings
from app.core.logging import logger
from app.nlp.preprocessing import tokenize

class BM25Retriever:
    def __init__(self):
        self.model_path = os.path.join(settings.INDEX_DIR, "bm25.pkl")
        self.bm25 = None
        self.chunks: List[Dict[str, Any]] = []

    def build_index(self, chunks: List[Dict[str, Any]]):
        self.chunks = chunks
        if not chunks:
            self.bm25 = None
            return

        tokenized_corpus = [tokenize(c["content"].lower()) for c in chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)

        with open(self.model_path, "wb") as f:
            pickle.dump({"bm25": self.bm25, "chunks": self.chunks}, f)
        logger.info(f"BM25 Retriever indexed {len(chunks)} chunks.")

    def load_index(self) -> bool:
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    data = pickle.load(f)
                    self.bm25 = data["bm25"]
                    self.chunks = data["chunks"]
                    return True
            except Exception as e:
                logger.error(f"Failed to load BM25 index: {e}")
        return False

    def search(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        if not self.bm25 or not self.chunks:
            if not self.load_index():
                return []

        tokens = tokenize(query.lower())
        if not tokens:
            return []

        scores = self.bm25.get_scores(tokens)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            if score > 0.0:
                results.append((self.chunks[idx], score))
        return results

bm25_retriever = BM25Retriever()
