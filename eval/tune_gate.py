#!/usr/bin/env python3
"""
Evidence Gate Tuning Script: sweeps normalized evidence thresholds on eval/rag_set.csv
Evaluates both:
1. RRF raw score threshold (e.g. 0.015 - 0.035)
2. Normalized Cross-Encoder rerank score threshold (sigmoid(s) from 0.2 to 0.8)
Outputs real evaluation metrics to eval/results/04_gate_tuning.json and selects optimal threshold.
"""
import sys
import csv
import json
import math
from pathlib import Path

NLP_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
sys.path.insert(0, str(NLP_DIR))

from features.f01_hybrid_retrieval.hybrid_retriever import hybrid_retriever

def sigmoid(s):
    try:
        return 1.0 / (1.0 + math.exp(-s))
    except OverflowError:
        return 0.0 if s < 0 else 1.0

def run_tune():
    base_dir = Path(__file__).resolve().parent.parent
    rag_csv = base_dir / "eval" / "rag_set.csv"
    with open(rag_csv, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    print(f"Loaded {len(rows)} queries from {rag_csv}")

    data_points = []
    for r in rows:
        q = r["query"]
        is_ans = r["is_answerable"].lower() == "true"
        gold_doc = r.get("gold_doc", "").strip()
        candidates = hybrid_retriever.retrieve(q, top_k=3)
        top_c = candidates[0] if candidates else None

        raw_rrf = top_c.get("score", 0.0) if top_c else 0.0
        rerank_score = top_c.get("rerank_score") if top_c else None
        norm_score = sigmoid(rerank_score) if rerank_score is not None else raw_rrf
        
        # Check if gold doc in top 3
        hit_doc = any(c.get("doc_name") == gold_doc for c in candidates) if gold_doc else False

        data_points.append({
            "query": q,
            "is_answerable": is_ans,
            "raw_rrf": raw_rrf,
            "rerank_score": rerank_score,
            "norm_score": norm_score,
            "hit_doc": hit_doc,
            "has_chunks": bool(candidates)
        })

    # Sweep normalized threshold
    thresholds = [0.01, 0.02, 0.025, 0.028, 0.030, 0.032, 0.035, 0.1, 0.3, 0.5]
    sweep_results = []
    best_t = 0.028
    best_f1 = -1.0

    unans_total = len([d for d in data_points if not d["is_answerable"]])
    ans_total = len([d for d in data_points if d["is_answerable"]])

    for t in thresholds:
        tp = 0
        fp = 0
        fn = 0
        tn = 0

        for dp in data_points:
            # Gated as answerable if score >= t
            score_to_check = dp["norm_score"] if dp["rerank_score"] is not None else dp["raw_rrf"]
            gated_answer = dp["has_chunks"] and (score_to_check >= t)

            if dp["is_answerable"]:
                if gated_answer:
                    tp += 1
                else:
                    fn += 1
            else:
                if gated_answer:
                    fp += 1
                else:
                    tn += 1

        ans_correct_rate = tp / ans_total if ans_total > 0 else 0
        correct_idk_rate = tn / unans_total if unans_total > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0

        res_row = {
            "threshold": t,
            "answered_rate": round(ans_correct_rate * 100, 2),
            "correct_idk_rate": round(correct_idk_rate * 100, 2),
            "precision": round(precision * 100, 2),
            "recall": round(recall * 100, 2),
            "f1": round(f1, 4)
        }
        sweep_results.append(res_row)
        if f1 > best_f1:
            best_f1 = f1
            best_t = t

    print("=== EVIDENCE GATE SWEEP ON RAG BENCHMARK SET ===")
    for r in sweep_results:
        print(f"Threshold: {r['threshold']:<5} -> AnsweredRate: {r['answered_rate']}% | CorrectIDK: {r['correct_idk_rate']}% | Prec: {r['precision']}% | F1: {r['f1']}")

    print(f"\nRecommended optimal threshold: {best_t} (F1: {best_f1})")
    
    out_path = base_dir / "eval" / "results" / "04_gate_tuning.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump({"optimal_threshold": best_t, "sweep": sweep_results}, f, indent=2)

if __name__ == "__main__":
    run_tune()
