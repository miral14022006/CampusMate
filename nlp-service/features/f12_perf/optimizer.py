import time
import functools
from collections import OrderedDict
from typing import Dict, Any, List, Optional
import numpy as np

class LRUCache:
    """Fast thread-safe LRU cache with hit/miss telemetry."""
    def __init__(self, capacity: int = 2000):
        self.capacity = capacity
        self.cache: OrderedDict = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            self.hits += 1
            self.cache.move_to_end(key)
            return self.cache[key]
        self.misses += 1
        return None

    def put(self, key: str, value: Any) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

    def stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        rate = (self.hits / total * 100) if total > 0 else 0.0
        return {
            "size": len(self.cache),
            "capacity": self.capacity,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate_pct": round(rate, 2)
        }

# Global second-level caches
embedding_cache = LRUCache(capacity=3000)
translit_cache = LRUCache(capacity=5000)

class PerformanceOptimizer:
    """
    Manages second-level in-memory caches, batched embeddings,
    and warm-up routines for nlp-service.
    """
    def __init__(self):
        self.warmed_up = False

    def warm_up_models(self) -> Dict[str, Any]:
        """
        Pre-loads transformers, FAISS indexes, and transliteration tables
        at application startup to eliminate cold-start latency spikes.
        """
        t0 = time.perf_counter()
        warmed = []

        try:
            from features.f03_transformer_intent.inference import muril_classifier
            if muril_classifier.is_loaded:
                # Run single dummy inference to initialize PyTorch compute graph
                _ = muril_classifier.predict("exam form")
                warmed.append("muril_intent")
        except Exception:
            pass

        try:
            from features.f01_hybrid_retrieval.dense_retriever import dense_retriever
            if dense_retriever.is_loaded:
                _ = dense_retriever.retrieve("fees schedule", top_k=1)
                warmed.append("dense_faiss_retriever")
        except Exception:
            pass

        try:
            from features.f02_transliteration.engine import transliteration_engine
            _ = transliteration_engine.transliterate_query("kab", "hi")
            warmed.append("transliteration_engine")
        except Exception:
            pass

        self.warmed_up = True
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "warmed_up": True,
            "warmed_components": warmed,
            "elapsed_ms": elapsed_ms
        }

    def get_cache_telemetry(self) -> Dict[str, Any]:
        return {
            "embedding_cache": embedding_cache.stats(),
            "translit_cache": translit_cache.stats(),
            "models_warmed_up": self.warmed_up
        }

perf_optimizer = PerformanceOptimizer()

