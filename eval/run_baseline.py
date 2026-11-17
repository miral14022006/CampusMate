#!/usr/bin/env python3
"""
Baseline Evaluation Script (00-baseline)
Computes:
1. Language-ID Accuracy (Overall and Per-Dialect breakdown)
2. Intent Accuracy & Macro-F1 across 20 intents
3. Document Retrieval Recall@3 and Mean Reciprocal Rank (MRR)
Writes verified numbers to eval/results/00-baseline.json
"""
import sys
import json
import time
from pathlib import Path
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, classification_report

# Add paths
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root / "nlp-service"))

from app.modules.language_detect import language_detector
from app.modules.intent_baseline import intent_classifier
from app.modules.retrieval_tfidf import retriever

def evaluate_baseline():
    dataset_path = project_root / "data" / "datasets" / "seed_queries.csv"
    if not dataset_path.exists():
        print(f"Error: Dataset not found at {dataset_path}")
        return

    df = pd.read_csv(dataset_path)
    total_samples = len(df)
    print(f"Loaded {total_samples} samples for baseline evaluation.")

    # 1. Language ID Evaluation
    lang_true = df["language"].tolist()
    lang_pred = []
    lang_latencies = []

    for q in df["query"].astype(str):
        t0 = time.perf_counter()
        res = language_detector.detect(q)
        t1 = time.perf_counter()
        lang_pred.append(res["language"])
        lang_latencies.append((t1 - t0) * 1000)

    lang_accuracy = accuracy_score(lang_true, lang_pred)
    avg_lang_latency = sum(lang_latencies) / len(lang_latencies)

    # Breakdown per language
    per_language_acc = {}
    for lang in sorted(list(set(lang_true))):
        sub_true = [t for t, p in zip(lang_true, lang_pred) if t == lang]
        sub_pred = [p for t, p in zip(lang_true, lang_pred) if t == lang]
        per_language_acc[lang] = {
            "samples": len(sub_true),
            "accuracy": round(accuracy_score(sub_true, sub_pred), 4)
        }

    # 2. Intent Classification Evaluation
    intent_true = df["intent"].tolist()
    intent_pred = []
    intent_latencies = []

    for q in df["query"].astype(str):
        t0 = time.perf_counter()
        res = intent_classifier.predict(q)
        t1 = time.perf_counter()
        intent_pred.append(res["intent"])
        intent_latencies.append((t1 - t0) * 1000)

    intent_accuracy = accuracy_score(intent_true, intent_pred)
    intent_macro_f1 = f1_score(intent_true, intent_pred, average="macro", zero_division=0)
    avg_intent_latency = sum(intent_latencies) / len(intent_latencies)

    # 3. Retrieval Evaluation (Recall@3 and MRR)
    # Define ground truth doc mapping per intent for sample documents
    INTENT_DOC_MAP = {
        "exam_form_deadline": "01_exam_notice_en.txt",
        "exam_timetable": "01_exam_notice_en.txt",
        "fee_payment": "02_fee_notice_en.txt",
        "fee_structure": "02_fee_notice_en.txt",
        "scholarship": "02_fee_notice_en.txt",
        "holidays": "03_academic_calendar_en.txt",
        "hostel": "04_hostel_rules_hi.txt",
        "library_timings": "05_library_rules_gu.txt"
    }

    # Filter evaluation to queries where ground truth docs exist
    retrieval_queries = [
        (row["query"], INTENT_DOC_MAP[row["intent"]])
        for _, row in df.iterrows()
        if row["intent"] in INTENT_DOC_MAP
    ]

    hits_at_3 = 0
    reciprocal_ranks = []

    for q_text, expected_doc in retrieval_queries:
        hits = retriever.retrieve(q_text, top_k=3)
        retrieved_docs = [h["doc_name"] for h in hits]

        # Recall@3
        if expected_doc in retrieved_docs:
            hits_at_3 += 1
            rank = retrieved_docs.index(expected_doc) + 1
            reciprocal_ranks.append(1.0 / rank)
        else:
            reciprocal_ranks.append(0.0)

    recall_at_3 = hits_at_3 / len(retrieval_queries) if retrieval_queries else 0.0
    mrr = sum(reciprocal_ranks) / len(reciprocal_ranks) if reciprocal_ranks else 0.0

    # Compile Results
    results = {
        "evaluation_name": "00-baseline",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_seed_samples": total_samples,
        "language_identification": {
            "overall_accuracy": round(lang_accuracy, 4),
            "avg_latency_ms": round(avg_lang_latency, 3),
            "breakdown": per_language_acc
        },
        "intent_classification": {
            "total_intents": 20,
            "accuracy": round(intent_accuracy, 4),
            "macro_f1": round(intent_macro_f1, 4),
            "avg_latency_ms": round(avg_intent_latency, 3)
        },
        "retrieval_tfidf": {
            "evaluated_queries": len(retrieval_queries),
            "recall_at_3": round(recall_at_3, 4),
            "mrr": round(mrr, 4)
        }
    }

    out_file = project_root / "eval" / "results" / "00-baseline.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 60)
    print(" BASELINE EVALUATION METRICS (00-baseline.json)")
    print("=" * 60)
    print(f" Language-ID Accuracy : {results['language_identification']['overall_accuracy'] * 100:.2f}% (Avg Latency: {results['language_identification']['avg_latency_ms']} ms)")
    print(f" Intent Accuracy      : {results['intent_classification']['accuracy'] * 100:.2f}% (Macro-F1: {results['intent_classification']['macro_f1']:.4f})")
    print(f" Retrieval Recall@3   : {results['retrieval_tfidf']['recall_at_3'] * 100:.2f}%")
    print(f" Retrieval MRR        : {results['retrieval_tfidf']['mrr']:.4f}")
    print("=" * 60)
    print(f"Results successfully written to: {out_file}\n")

if __name__ == "__main__":
    evaluate_baseline()

