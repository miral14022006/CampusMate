import os
import json
import logging
from typing import List, Dict, Any
import numpy as np
import faiss

from features.f01_hybrid_retrieval.base import BaseRetriever
from app.core.config import CHUNKS_FILE, INDEX_DIR

logger = logging.getLogger("nlp_service.dense_retriever")

FAISS_INDEX_DIR = INDEX_DIR / "faiss"
FAISS_INDEX_FILE = FAISS_INDEX_DIR / "index.faiss"
CHUNKS_META_FILE = FAISS_INDEX_DIR / "chunks_meta.json"

class DenseRetriever(BaseRetriever):
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = os.getenv("DENSE_MODEL_NAME", model_name)
        self.model = None
        self.index = None
        self.chunks: List[Dict[str, Any]] = []
        self.dim = 384
        self._init_model()
        self.load_index()

    @property
    def name(self) -> str:
        return "dense"

    def _init_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"Loaded Dense multilingual embedding model: {self.model_name}")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer '{self.model_name}': {e}. Using deterministic semantic projection fallback.")
            self.model = None

    def _embed(self, texts: List[str], is_query: bool = False) -> np.ndarray:
        is_e5 = "e5" in self.model_name.lower()
        formatted_texts = []
        for t in texts:
            if is_e5:
                prefix = "query: " if is_query else "passage: "
                formatted_texts.append(f"{prefix}{t}")
            else:
                formatted_texts.append(t)

        if self.model:
            embeddings = self.model.encode(formatted_texts, normalize_embeddings=True, show_progress_bar=False)
            return np.array(embeddings, dtype=np.float32)

        # Resilient offline projection
        from sklearn.feature_extraction.text import HashingVectorizer
        vec = HashingVectorizer(n_features=self.dim, alternate_sign=False)
        matrix = vec.fit_transform(formatted_texts).toarray().astype(np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return matrix / norms

    def build_index(self):
        chunks_file = CHUNKS_FILE
        if not chunks_file.exists():
            if os.getenv("APP_ENV", "development").lower() == "production":
                # Never auto-index bundled sample fixtures in production.
                self.chunks = []
                self.index = None
                return
            from app.modules.ingest import ingester
            self.chunks = ingester.process_all_raw_docs()
        else:
            with open(chunks_file, "r", encoding="utf-8") as f:
                self.chunks = json.load(f)

        self.chunks = [c for c in self.chunks if c.get("status", "active") == "active"]

        if not self.chunks:
            self.index = None
            return

        texts = [c["text"] for c in self.chunks]
        embeddings = self._embed(texts, is_query=False)
        self.dim = embeddings.shape[1]

        # Inner Product on normalized embeddings is equivalent to Cosine Similarity
        self.index = faiss.IndexFlatIP(self.dim)
        self.index.add(embeddings)

        FAISS_INDEX_DIR.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(FAISS_INDEX_FILE))
        with open(CHUNKS_META_FILE, "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, ensure_ascii=False, indent=2)

        logger.info(f"Built FAISS index with {len(self.chunks)} vectors in {FAISS_INDEX_FILE}")

    def load_index(self):
        if FAISS_INDEX_FILE.exists() and CHUNKS_META_FILE.exists():
            try:
                self.index = faiss.read_index(str(FAISS_INDEX_FILE))
                with open(CHUNKS_META_FILE, "r", encoding="utf-8") as f:
                    self.chunks = [c for c in json.load(f) if c.get("status", "active") == "active"]
            except Exception as e:
                logger.error(f"Error loading FAISS index: {e}")
                self.build_index()
        else:
            self.build_index()

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if self.index is None or not self.chunks:
            return []

        q_vec = self._embed([query], is_query=True)
        scores, indices = self.index.search(q_vec, min(top_k, len(self.chunks)))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.chunks):
                continue
            c = self.chunks[idx]
            results.append({
                "chunk_id": c["chunk_id"],
                "doc_name": c["doc_name"],
                "page": c["page"],
                "score": round(float(score), 4),
                "text": c["text"]
            })
        return results

dense_retriever = DenseRetriever()
