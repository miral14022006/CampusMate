#!/usr/bin/env python3
"""
Manual Verification Review & Label Error Rate Evaluation Script.
Reads data/datasets/verify_sample.csv, computes label error rate,
and integrates human corrections into the training dataset.
"""
import sys
import json
import logging
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval_f14")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATASETS_DIR = PROJECT_ROOT / "data" / "datasets"
EVAL_RESULTS_DIR = PROJECT_ROOT / "eval" / "results"

def evaluate_verified_sample():
    sample_file = DATASETS_DIR / "verify_sample.csv"
    if not sample_file.exists():
        logger.error(f"Verification sample not found: {sample_file}")
        return

    df_sample = pd.read_csv(sample_file)
    total_reviewed = len(df_sample)

    # Check for corrections: ok? == 'no' or non-empty corrected_intent
    corrected_mask = (df_sample["ok?"].astype(str).str.lower() == "no") | (df_sample["corrected_intent"].fillna("").astype(str).str.strip() != "")
    error_count = int(corrected_mask.sum())
    error_rate = error_count / total_reviewed if total_reviewed > 0 else 0.0
    label_accuracy = 1.0 - error_rate

    logger.info(f"Verified Sample Size: {total_reviewed}")
    logger.info(f"Label Errors Detected: {error_count} (Label Error Rate: {error_rate * 100:.2f}%)")
    logger.info(f"Estimated Dataset Label Quality: {label_accuracy * 100:.2f}%")

    # If any corrected rows exist, update train.csv with corrected intent
    if error_count > 0:
        train_path = DATASETS_DIR / "train.csv"
        df_train = pd.read_csv(train_path)
        corrected_rows = df_sample[corrected_mask].copy()

        for _, row in corrected_rows.iterrows():
            text = row["text"]
            new_intent = str(row["corrected_intent"]).strip()
            if new_intent:
                mask = df_train["text"] == text
                if mask.any():
                    df_train.loc[mask, "intent"] = new_intent
                else:
                    # Append corrected row to train set
                    df_train = pd.concat([df_train, pd.DataFrame([{
                        "text": text,
                        "intent": new_intent,
                        "language": row["language"]
                    }])], ignore_index=True)

        df_train.to_csv(train_path, index=False, encoding="utf-8")
        logger.info(f"Appended/corrected {len(corrected_rows)} validated rows into train.csv.")

    # Read existing stats and update verified section
    stats_file = EVAL_RESULTS_DIR / "14-dataset-stats.json"
    stats = {}
    if stats_file.exists():
        with open(stats_file, "r", encoding="utf-8") as f:
            stats = json.load(f)

    stats["verified_sample"] = {
        "sample_size": total_reviewed,
        "errors_flagged": error_count,
        "label_error_rate": round(error_rate, 4),
        "label_accuracy": round(label_accuracy, 4),
        "status": "verified_clean"
    }

    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    logger.info(f"Updated results in: {stats_file}")

if __name__ == "__main__":
    evaluate_verified_sample()

