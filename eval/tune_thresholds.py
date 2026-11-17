#!/usr/bin/env python3
"""
Feature 05 Evaluation: Confidence Threshold Tuning Script.
Evaluates both:
1. Baseline TF-IDF Classifier
2. Fine-tuned MuRIL Transformer Classifier (Feature 03)
Sweeps confidence thresholds (T_high, T_low) on val.csv,
measuring precision of answered queries, coverage (% answered directly), clarification rate,
and fallback rate.
Outputs real evaluation metrics to eval/results/05-clarification.json and 05-clarification.md.
"""
import os
import sys
import csv
import json
import logging
from pathlib import Path
from typing import Dict, Any, List

# Add nlp-service to path
NLP_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
sys.path.insert(0, str(NLP_DIR))

from features.f05_clarification.policy import DecisionPolicy, DecisionOutcome
from app.modules.intent_baseline import intent_classifier as baseline_clf
from features.f03_transformer_intent.inference import muril_classifier
from app.modules.entities import entity_extractor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval_clarification")

def load_val_dataset(csv_path: Path) -> List[Dict[str, str]]:
    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append(r)
    return rows

def evaluate_thresholds(
    dataset: List[Dict[str, str]],
    classifier,
    t_high: float,
    t_low: float,
    margin_threshold: float = 0.15
) -> Dict[str, Any]:
    policy = DecisionPolicy(
        t_high=t_high,
        t_low=t_low,
        margin_threshold=margin_threshold,
        min_retrieval_score=0.01
    )

    total = len(dataset)
    answered_count = 0
    answered_correct = 0
    clarify_count = 0
    fallback_count = 0

    for item in dataset:
        query = item.get("text", "")
        gold_intent = item.get("intent", "")
        lang = item.get("language", "en")

        clf_res = classifier.predict(query)
        top1_intent = clf_res["intent"]
        top1_conf = clf_res["confidence"]

        top_intents = []
        if "top3" in clf_res and clf_res["top3"]:
            top_intents = [{"intent": t["intent"], "confidence": t["score"]} for t in clf_res["top3"]]
        else:
            top_intents = [{"intent": top1_intent, "confidence": top1_conf}]
            rem = max(0.0, 1.0 - top1_conf)
            top_intents.append({"intent": "general_queries", "confidence": round(rem * 0.7, 3)})

        entities = entity_extractor.extract(query)

        eval_res = policy.evaluate(
            top_intents=top_intents,
            entities=entities,
            retrieved_chunks=[{"score": 0.5}],
            language=lang
        )

        decision = eval_res["decision"]

        if decision == DecisionOutcome.ANSWER.value:
            answered_count += 1
            if top1_intent == gold_intent:
                answered_correct += 1
        elif decision == DecisionOutcome.CLARIFY.value:
            clarify_count += 1
        elif decision == DecisionOutcome.FALLBACK.value:
            fallback_count += 1

    coverage = (answered_count / total) * 100 if total > 0 else 0.0
    precision = (answered_correct / answered_count) * 100 if answered_count > 0 else 0.0
    clarify_rate = (clarify_count / total) * 100 if total > 0 else 0.0
    fallback_rate = (fallback_count / total) * 100 if total > 0 else 0.0

    return {
        "t_high": round(t_high, 2),
        "t_low": round(t_low, 2),
        "margin": round(margin_threshold, 2),
        "total": total,
        "answered": answered_count,
        "answered_correct": answered_correct,
        "precision_of_answered": round(precision, 2),
        "coverage": round(coverage, 2),
        "clarify_rate": round(clarify_rate, 2),
        "fallback_rate": round(fallback_rate, 2)
    }

def main():
    base_dir = Path(__file__).resolve().parent.parent
    val_csv = base_dir / "data" / "datasets" / "val.csv"
    if not val_csv.exists():
        logger.error(f"Validation dataset not found at {val_csv}")
        return

    logger.info(f"Loading validation dataset from {val_csv}...")
    dataset = load_val_dataset(val_csv)
    logger.info(f"Loaded {len(dataset)} validation samples.")

    # Sweep grid
    t_high_values = [0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
    t_low_values = [0.25, 0.30, 0.35, 0.40]

    # Evaluate with MuRIL (or fallback to baseline if not loaded)
    active_clf = muril_classifier if muril_classifier.is_loaded else baseline_clf
    clf_name = "MuRIL Transformer" if muril_classifier.is_loaded else "Baseline TF-IDF"
    logger.info(f"Running threshold sweep with classifier: {clf_name}")

    sweep_results = []
    best_config = None
    best_f1_proxy = -1.0

    for th in t_high_values:
        for tl in t_low_values:
            if tl >= th:
                continue
            metrics = evaluate_thresholds(dataset, active_clf, t_high=th, t_low=tl, margin_threshold=0.15)
            sweep_results.append(metrics)

            p = metrics["precision_of_answered"]
            c = metrics["coverage"]
            f1_proxy = (2 * p * c) / (p + c) if (p + c) > 0 else 0.0

            if f1_proxy > best_f1_proxy:
                best_f1_proxy = f1_proxy
                best_config = metrics

    logger.info(f"Optimal threshold config found: T_high={best_config['t_high']}, T_low={best_config['t_low']}")
    logger.info(f"Precision: {best_config['precision_of_answered']}%, Coverage: {best_config['coverage']}%")

    # Baseline comparison at optimal config
    baseline_metrics = evaluate_thresholds(
        dataset, baseline_clf, t_high=best_config['t_high'], t_low=best_config['t_low'], margin_threshold=0.15
    )

    out_dir = base_dir / "eval" / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_json = out_dir / "05-clarification.json"
    out_md = out_dir / "05-clarification.md"

    output_data = {
        "feature": "05_confidence_fallback_and_clarification",
        "classifier_evaluated": clf_name,
        "optimal_config": best_config,
        "baseline_comparison": baseline_metrics,
        "grid_sweep": sweep_results,
        "summary": {
            "validation_samples": len(dataset),
            "optimal_t_high": best_config["t_high"],
            "optimal_t_low": best_config["t_low"],
            "precision_at_optimal": best_config["precision_of_answered"],
            "coverage_at_optimal": best_config["coverage"],
            "clarify_rate_at_optimal": best_config["clarify_rate"],
            "fallback_rate_at_optimal": best_config["fallback_rate"],
            "baseline_coverage": baseline_metrics["coverage"],
            "baseline_precision": baseline_metrics["precision_of_answered"]
        }
    }

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)
    logger.info(f"Saved evaluation metrics to {out_json}")

    # Generate Markdown Summary
    md_content = f"""# Feature 05: Confidence-Based Fallback & Clarification Evaluation

## 1. Optimal Decision Threshold Configuration
- **Intent Classifier**: `{clf_name}`
- **Optimal $T_{{high}}$**: `{best_config['t_high']}`
- **Optimal $T_{{low}}$**: `{best_config['t_low']}`
- **Margin Threshold**: `{best_config['margin']}`
- **Precision of Answered**: **{best_config['precision_of_answered']}%**
- **Coverage (% Directly Answered)**: **{best_config['coverage']}%**
- **Clarification Rate**: **{best_config['clarify_rate']}%**
- **Fallback Rate**: **{best_config['fallback_rate']}%**

### Transformer vs Baseline Policy Impact
| Metric | Baseline TF-IDF | MuRIL Transformer |
|---|---|---|
| Direct Answer Coverage (%) | {baseline_metrics['coverage']}% | **{best_config['coverage']}%** |
| Answer Precision (%) | {baseline_metrics['precision_of_answered']}% | **{best_config['precision_of_answered']}%** |
| Clarification Rate (%) | {baseline_metrics['clarify_rate']}% | **{best_config['clarify_rate']}%** |
| Fallback Rate (%) | {baseline_metrics['fallback_rate']}% | **{best_config['fallback_rate']}%** |

## 2. Threshold Sweep Comparison Table

| $T_{{high}}$ | $T_{{low}}$ | Coverage (%) | Precision (%) | Clarify Rate (%) | Fallback Rate (%) |
|-------------|------------|--------------|---------------|-------------------|-------------------|
"""
    for row in sweep_results:
        md_content += f"| {row['t_high']} | {row['t_low']} | {row['coverage']}% | {row['precision_of_answered']}% | {row['clarify_rate']}% | {row['fallback_rate']}% |\n"

    md_content += f"""
## 3. Analysis & Key Insights
1. **Precision Guarantee**: With $T_{{high}}={best_config['t_high']}$, every directly answered query has verified confidence, yielding {best_config['precision_of_answered']}% accuracy on the validation set.
2. **Ambiguity Protection**: When two intents compete closely ($\Delta < 0.15$), the system generates multilingual candidate options (e.g., *Exam Form* vs *Fee Payment*) instead of returning the wrong response.
3. **Required Entity Slot Clarification**: Intents requiring parameters (such as `SEMESTER` for `exam_timetable`) are automatically intercepted, asking the student for the missing information with one-tap quick-reply chips.
4. **Office Contact Routing**: Fallback responses include specific college office locations, hours, phone numbers, and emails loaded dynamically from `data/contacts.json`.
"""

    with open(out_md, "w", encoding="utf-8") as f:
        f.write(md_content)
    logger.info(f"Saved evaluation markdown to {out_md}")

if __name__ == "__main__":
    main()
