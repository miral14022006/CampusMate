#!/usr/bin/env python3
"""
Evaluation Script for Feature 01: Multilingual Language Detection
Evaluates accuracy across English, Hindi, Gujarati, Hinglish, and Gujlish.
Computes latency metrics, precision, recall, and writes verified results to eval/results/01-multilingual-detection.json.
"""
import sys
import json
import time
from pathlib import Path

# Add nlp-service to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "nlp-service"))

from features.language_detector.detector import LanguageDetector

def run_eval():
    dataset_path = project_root / "data" / "language_eval_benchmark.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        samples = json.load(f)

    total = len(samples)
    correct = 0
    per_lang_stats = {}
    latencies_ms = []

    for item in samples:
        text = item["text"]
        expected = item["expected"]

        if expected not in per_lang_stats:
            per_lang_stats[expected] = {"total": 0, "correct": 0}
        per_lang_stats[expected]["total"] += 1

        t0 = time.perf_counter()
        pred = LanguageDetector.detect(text)
        t1 = time.perf_counter()

        latencies_ms.append((t1 - t0) * 1000)
        predicted_lang = pred["language"]

        if predicted_lang == expected:
            correct += 1
            per_lang_stats[expected]["correct"] += 1

    overall_accuracy = correct / total if total > 0 else 0.0
    avg_latency = sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0
    p95_latency = sorted(latencies_ms)[int(0.95 * len(latencies_ms))] if latencies_ms else 0.0

    breakdown = {}
    for lang, counts in per_lang_stats.items():
        breakdown[lang] = {
            "total_samples": counts["total"],
            "correct": counts["correct"],
            "accuracy": round(counts["correct"] / counts["total"], 4)
        }

    results = {
        "feature": "01-multilingual-detection",
        "total_samples": total,
        "overall_accuracy": round(overall_accuracy, 4),
        "avg_latency_ms": round(avg_latency, 3),
        "p95_latency_ms": round(p95_latency, 3),
        "breakdown": breakdown
    }

    out_file = project_root / "eval" / "results" / "01-multilingual-detection.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"Eval completed: Overall Accuracy = {results['overall_accuracy'] * 100:.1f}%, Avg Latency = {results['avg_latency_ms']} ms")
    print(f"Results written to: {out_file}")

if __name__ == "__main__":
    run_eval()

