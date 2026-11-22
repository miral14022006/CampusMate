import os
import json
import faiss
import numpy as np
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
from app.core.config import settings
from app.core.logging import logger

class DenseRetriever:
    def __init__(self):
        self.index_file = os.path.join(settings.INDEX_DIR, "faiss_index.bin")
        self.meta_file = os.path.join(settings.INDEX_DIR, "chunks.json")
        self.model = None
        self.index = None
        self.chunks: List[Dict[str, Any]] = []

    def _get_model(self):
        if self.model is None:
            logger.info(f"Loading SentenceTransformer: {settings.EMBEDDING_MODEL}")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        return self.model

    def build_index(self, chunks: List[Dict[str, Any]]):
        self.chunks = chunks
        if not chunks:
            self.index = None
            return

        model = self._get_model()
        texts = [c["content"] for c in chunks]
        embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings.astype(np.float32))

        faiss.write_index(self.index, self.index_file)
        with open(self.meta_file, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, indent=2, ensure_ascii=False)

        logger.info(f"Dense FAISS Index built with {len(chunks)} vectors of dim {dim}.")

    def load_index(self) -> bool:
        if os.path.exists(self.index_file) and os.path.exists(self.meta_file):
            try:
                self.index = faiss.read_index(self.index_file)
                with open(self.meta_file, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
                return True
            except Exception as e:
                logger.error(f"Failed to load FAISS index: {e}")
        return False

    def search(self, query: str, top_k: int = 10) -> List[Tuple[Dict[str, Any], float]]:
        if self.index is None or not self.chunks:
            if not self.load_index():
                return []

        model = self._get_model()
        q_emb = model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype(np.float32)

        D, I = self.index.search(q_emb, min(top_k, len(self.chunks)))
        results = []
        for dist, idx in zip(D[0], I[0]):
            if idx != -1 and idx < len(self.chunks):
                results.append((self.chunks[idx], float(dist)))
        return results

dense_retriever = DenseRetriever()
