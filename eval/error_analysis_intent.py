#!/usr/bin/env python3
"""
Feature 03 Error Analysis:
Identifies and lists the 30 most confident mistakes made by the intent classifier
on the held-out test dataset to guide active learning and pattern refinement.
"""
import sys
import json
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "nlp-service"))

from features.f03_transformer_intent.inference import muril_classifier

TEST_CSV = PROJECT_ROOT / "data" / "datasets" / "test.csv"
OUTPUT_REPORT = PROJECT_ROOT / "eval" / "results" / "03-intent-errors.json"

def analyze_confident_mistakes(top_k: int = 30):
    if not TEST_CSV.exists():
        print(f"Error: {TEST_CSV} not found.")
        return

    df_test = pd.read_csv(TEST_CSV)
    mistakes = []

    print(f"Analyzing {len(df_test)} test queries for confident prediction errors...")

    for idx, row in df_test.iterrows():
        text = str(row["text"])
        gold_intent = str(row["intent"])
        lang = str(row["language"])

        res = muril_classifier.predict(text)
        pred_intent = res["intent"]
        conf = res["confidence"]

        if pred_intent != gold_intent:
            mistakes.append({
                "query": text,
                "language": lang,
                "gold_intent": gold_intent,
                "predicted_intent": pred_intent,
                "confidence": conf,
                "top3": res["top3"]
            })

    # Sort mistakes by confidence descending (most confident false positives first)
    mistakes.sort(key=lambda x: x["confidence"], reverse=True)
    top_mistakes = mistakes[:top_k]

    OUTPUT_REPORT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_REPORT, "w", encoding="utf-8") as f:
        json.dump({
            "total_test_samples": len(df_test),
            "total_errors": len(mistakes),
            "error_rate": round(len(mistakes) / len(df_test), 4),
            "top_confident_mistakes": top_mistakes
        }, f, indent=2)

    print("\n" + "=" * 80)
    print(f" TOP {len(top_mistakes)} MOST CONFIDENT MISTAKES (Error Analysis)")
    print("=" * 80)
    for i, m in enumerate(top_mistakes, 1):
        print(f"[{i:02d}] Conf: {m['confidence']:.4f} | Lang: {m['language'].ljust(7)}")
        print(f"     Query:     \"{m['query']}\"")
        print(f"     Gold:      {m['gold_intent']}")
        print(f"     Predicted: {m['predicted_intent']}")
        print("-" * 80)

    print(f"\nFull error report saved to: {OUTPUT_REPORT}\n")

if __name__ == "__main__":
    analyze_confident_mistakes()

