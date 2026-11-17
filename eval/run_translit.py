#!/usr/bin/env python3
"""
Feature 02 Evaluation:
Measures Retrieval Recall@3 and Intent Accuracy on Hinglish and Gujlish queries
WITH vs WITHOUT transliteration.
Writes comparative metrics to eval/results/02-transliteration.json.
"""
import sys
import json
import time
from pathlib import Path
import pandas as pd
from sklearn.metrics import accuracy_score

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "nlp-service"))

from app.modules.intent_baseline import intent_classifier
from app.modules.retrieval_tfidf import retriever
from features.f02_transliteration.engine import transliteration_engine

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

def run_transliteration_eval():
    dataset_path = PROJECT_ROOT / "data" / "datasets" / "test.csv"
    if not dataset_path.exists():
        dataset_path = PROJECT_ROOT / "data" / "datasets" / "seed_queries.csv"

    df = pd.read_csv(dataset_path)

    # Filter to Hinglish and Gujlish code-mixed queries
    code_mixed = df[df["language"].isin(["hi-Latn", "gu-Latn"])].copy()
    total_queries = len(code_mixed)
    print(f"Evaluating Feature 02 on {total_queries} Hinglish & Gujlish queries...")

    # Evaluation targets
    y_true = code_mixed["intent"].tolist()

    # --- Mode 1: WITHOUT Transliteration (Baseline) ---
    pred_without = []
    retrieval_hits_without = 0
    retrieval_count = 0

    t0_without = time.perf_counter()
    for _, row in code_mixed.iterrows():
        q = str(row["text"])
        intent_true = row["intent"]

        # Intent
        res = intent_classifier.predict(q)
        pred_without.append(res["intent"])

        # Retrieval (if ground truth document exists)
        if intent_true in INTENT_DOC_MAP:
            expected_doc = INTENT_DOC_MAP[intent_true]
            hits = retriever.retrieve(q, top_k=3)
            retrieved_docs = [h["doc_name"] for h in hits]
            if expected_doc in retrieved_docs:
                retrieval_hits_without += 1
            retrieval_count += 1
    t1_without = time.perf_counter()

    acc_without = accuracy_score(y_true, pred_without)
    recall_without = retrieval_hits_without / retrieval_count if retrieval_count > 0 else 0.0
    latency_without = ((t1_without - t0_without) / total_queries) * 1000

    # --- Mode 2: WITH Transliteration (Feature 02) ---
    pred_with = []
    retrieval_hits_with = 0

    t0_with = time.perf_counter()
    for _, row in code_mixed.iterrows():
        q = str(row["text"])
        lang = row["language"]
        intent_true = row["intent"]

        # Transliterate to dual form (original + native Indic)
        translit_text, dual_form = transliteration_engine.transliterate_text(q, lang)

        # Intent with dual form
        res = intent_classifier.predict(dual_form)
        pred_with.append(res["intent"])

        # Retrieval with dual form
        if intent_true in INTENT_DOC_MAP:
            expected_doc = INTENT_DOC_MAP[intent_true]
            hits = retriever.retrieve(dual_form, top_k=3)
            retrieved_docs = [h["doc_name"] for h in hits]
            if expected_doc in retrieved_docs:
                retrieval_hits_with += 1
    t1_with = time.perf_counter()

    acc_with = accuracy_score(y_true, pred_with)
    recall_with = retrieval_hits_with / retrieval_count if retrieval_count > 0 else 0.0
    latency_with = ((t1_with - t0_with) / total_queries) * 1000

    # Calculate Deltas
    delta_intent_acc = round(acc_with - acc_without, 4)
    delta_recall_at_3 = round(recall_with - recall_without, 4)

    results = {
        "feature": "02-transliteration",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "evaluated_queries": total_queries,
        "languages": ["hi-Latn", "gu-Latn"],
        "retrieval_queries_count": retrieval_count,
        "metrics_without_transliteration": {
            "intent_accuracy": round(acc_without, 4),
            "retrieval_recall_at_3": round(recall_without, 4),
            "avg_latency_ms": round(latency_without, 3)
        },
        "metrics_with_transliteration": {
            "intent_accuracy": round(acc_with, 4),
            "retrieval_recall_at_3": round(recall_with, 4),
            "avg_latency_ms": round(latency_with, 3)
        },
        "performance_delta": {
            "intent_accuracy_gain": delta_intent_acc,
            "retrieval_recall_at_3_gain": delta_recall_at_3,
            "latency_overhead_ms": round(latency_with - latency_without, 3)
        }
    }

    out_file = PROJECT_ROOT / "eval" / "results" / "02-transliteration.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 65)
    print(" FEATURE 02 EVALUATION: WITH vs WITHOUT TRANSLITERATION")
    print("=" * 65)
    print(f" Without Transliteration -> Recall@3: {recall_without * 100:.2f}%, Intent Acc: {acc_without * 100:.2f}%")
    print(f" With Transliteration    -> Recall@3: {recall_with * 100:.2f}%, Intent Acc: {acc_with * 100:.2f}%")
    print(f" Delta / Improvement     -> Recall@3 Gain: +{delta_recall_at_3 * 100:.2f}%, Intent Gain: +{delta_intent_acc * 100:.2f}%")
    print(f" Results written to: {out_file}")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    run_transliteration_eval()

