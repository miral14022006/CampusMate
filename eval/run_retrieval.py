#!/usr/bin/env python3
"""
Feature 01: Comprehensive Retrieval Benchmark.
Compares TF-IDF, BM25, Dense (multilingual-e5 / semantic), Hybrid (BM25 + Dense RRF),
and Hybrid + Cross-Encoder Reranker on:
- Recall@1
- Recall@3
- Recall@5
- Mean Reciprocal Rank (MRR)
- Average Query Latency (ms)
Outputs eval/results/01-retrieval.json and eval/results/01-retrieval.md.
"""
import sys
import time
import json
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "nlp-service"))

from app.modules.retrieval_tfidf import retriever as tfidf_retriever
from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
from features.f01_hybrid_retrieval.dense_retriever import dense_retriever
from features.f01_hybrid_retrieval.hybrid_retriever import hybrid_retriever, hybrid_rerank_retriever
from features.f02_transliteration.engine import transliteration_engine

RETRIEVAL_SET_PATH = PROJECT_ROOT / "eval" / "retrieval_set.csv"
RESULTS_JSON_PATH = PROJECT_ROOT / "eval" / "results" / "01-retrieval.json"
RESULTS_MD_PATH = PROJECT_ROOT / "eval" / "results" / "01-retrieval.md"

def evaluate_retriever(name, retriever_obj, test_samples):
    hits_at_1 = 0
    hits_at_3 = 0
    hits_at_5 = 0
    reciprocal_ranks = []
    latencies = []

    for item in test_samples:
        raw_q = str(item.get("query", ""))
        lang = str(item.get("language", "en"))
        gold_doc = str(item.get("gold_doc", ""))

        # If transliteration is supported, use dual form for romanized queries
        if lang in ["hi-Latn", "gu-Latn"]:
            _, search_q = transliteration_engine.transliterate_text(raw_q, lang)
        else:
            search_q = raw_q

        t0 = time.perf_counter()
        hits = retriever_obj.retrieve(search_q, top_k=5)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)

        retrieved_docs = [h["doc_name"] for h in hits]

        # Recall@K
        if len(retrieved_docs) > 0 and retrieved_docs[0] == gold_doc:
            hits_at_1 += 1
        if gold_doc in retrieved_docs[:3]:
            hits_at_3 += 1
        if gold_doc in retrieved_docs[:5]:
            hits_at_5 += 1

        # MRR
        if gold_doc in retrieved_docs:
            rank = retrieved_docs.index(gold_doc) + 1
            reciprocal_ranks.append(1.0 / rank)
        else:
            reciprocal_ranks.append(0.0)

    n = len(test_samples)
    return {
        "method": name,
        "recall_at_1": round(hits_at_1 / n, 4),
        "recall_at_3": round(hits_at_3 / n, 4),
        "recall_at_5": round(hits_at_5 / n, 4),
        "mrr": round(sum(reciprocal_ranks) / n, 4),
        "avg_latency_ms": round(sum(latencies) / len(latencies), 3)
    }

def main():
    if not RETRIEVAL_SET_PATH.exists():
        from scripts.generate_retrieval_set import generate_retrieval_set
        generate_retrieval_set()

    df = pd.read_csv(RETRIEVAL_SET_PATH)
    test_samples = df.to_dict(orient="records")
    print(f"Loaded {len(test_samples)} gold retrieval test queries across languages.")

    retrieval_pipeline = [
        ("TF-IDF Baseline", tfidf_retriever),
        ("BM25", bm25_retriever),
        ("Dense (Multilingual e5)", dense_retriever),
        ("Hybrid (BM25 + Dense RRF)", hybrid_retriever),
        ("Hybrid + Cross-Encoder Rerank", hybrid_rerank_retriever)
    ]

    all_results = []
    print("\nEvaluating retrieval pipelines...")
    for label, r_obj in retrieval_pipeline:
        print(f" -> Testing {label}...")
        metrics = evaluate_retriever(label, r_obj, test_samples)
        all_results.append(metrics)
        print(f"    R@1: {metrics['recall_at_1']*100:.1f}% | R@3: {metrics['recall_at_3']*100:.1f}% | R@5: {metrics['recall_at_5']*100:.1f}% | MRR: {metrics['mrr']:.4f} | Latency: {metrics['avg_latency_ms']} ms")

    # Save JSON results
    output_data = {
        "feature": "01-hybrid-retrieval",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_test_queries": len(test_samples),
        "models_benchmarked": all_results
    }
    with open(RESULTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    # Save Markdown Table
    md_lines = [
        "# Retrieval Performance Comparison (Feature 01 vs Baseline)\n",
        f"Evaluated on `{len(test_samples)}` multi-dialect queries (English, Hindi, Gujarati, Hinglish, Gujlish).\n",
        "| Retrieval Pipeline | Recall@1 | Recall@3 | Recall@5 | MRR | Avg Latency (ms) |",
        "| :--- | :--- | :--- | :--- | :--- | :--- |"
    ]
    for res in all_results:
        md_lines.append(
            f"| **{res['method']}** | **{res['recall_at_1']*100:.2f}%** | **{res['recall_at_3']*100:.2f}%** | **{res['recall_at_5']*100:.2f}%** | **{res['mrr']:.4f}** | **{res['avg_latency_ms']} ms** |"
        )

    md_content = "\n".join(md_lines)
    with open(RESULTS_MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)

    print("\n" + "=" * 80)
    print(" RETRIEVAL COMPARISON BENCHMARK TABLE")
    print("=" * 80)
    print(md_content)
    print("=" * 80)
    print(f"Saved: {RESULTS_JSON_PATH}")
    print(f"Saved: {RESULTS_MD_PATH}\n")

if __name__ == "__main__":
    main()
