#!/usr/bin/env python3
"""
Feature 01 Demo:
Demonstrates hybrid retrieval across multiple queries and models (TF-IDF vs BM25 vs Dense vs Hybrid vs Hybrid+Rerank).
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "nlp-service"))

from features.f01_hybrid_retrieval.hybrid_retriever import get_retriever

SAMPLE_QUERIES = [
    "What is the fee structure for BTech Computer Engineering?",
    "कॉलेज में छात्रावास मेस का खाना और नियम क्या हैं?",
    "Exam form bharne ki last date kab hai late fees lagegi kya?"
]

def main():
    print("=" * 80)
    print(" FEATURE 01: HYBRID RETRIEVAL (BM25 + DENSE FAISS + RRF + RERANK) DEMO")
    print("=" * 80)

    for q in SAMPLE_QUERIES:
        print(f"\n[Query]: \"{q}\"")

        # 1. BM25
        bm25 = get_retriever("bm25")
        b_hits = bm25.retrieve(q, top_k=2)
        print(f" -> BM25 Top Match:   [{b_hits[0]['doc_name']} (score: {b_hits[0]['score']})] {b_hits[0]['text'][:80]}...")

        # 2. Hybrid RRF
        hybrid = get_retriever("hybrid")
        h_hits = hybrid.retrieve(q, top_k=2)
        print(f" -> Hybrid RRF Top:   [{h_hits[0]['doc_name']} (score: {h_hits[0]['score']})] {h_hits[0]['text'][:80]}...")

        # 3. Hybrid + Reranker
        hybrid_rerank = get_retriever("hybrid_rerank")
        hr_hits = hybrid_rerank.retrieve(q, top_k=2)
        print(f" -> Hybrid+Rerank:    [{hr_hits[0]['doc_name']} (score: {hr_hits[0].get('rerank_score', hr_hits[0]['score'])})] {hr_hits[0]['text'][:80]}...")
        print("-" * 80)

    print("\n[OK] Hybrid Retrieval Demonstration Complete.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()

