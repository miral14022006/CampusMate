import sys
import json
import logging
from pathlib import Path

# Add nlp-service to path
nlp_service_dir = Path(__file__).parent.parent / "nlp-service"
sys.path.insert(0, str(nlp_service_dir))

from features.f15_calendar_events.extractor import calendar_extractor

def run_calendar_eval():
    dataset_path = Path(__file__).parent / "calendar_dates_set.json"
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    benchmark = data.get("benchmark", [])

    total_gold_events = 0
    total_pred_events = 0
    true_positives = 0

    total_gold_ranges = 0
    exact_range_matches = 0

    results_by_lang = {}

    for item in benchmark:
        text = item["text"]
        lang = item.get("lang", "en")
        is_range = item.get("is_range", False)
        gold_events = item.get("gold", [])

        if lang not in results_by_lang:
            results_by_lang[lang] = {"gold": 0, "pred": 0, "tp": 0}

        pred_events = calendar_extractor.extract_dates_from_text(text)

        total_gold_events += len(gold_events)
        total_pred_events += len(pred_events)
        results_by_lang[lang]["gold"] += len(gold_events)
        results_by_lang[lang]["pred"] += len(pred_events)

        if is_range:
            total_gold_ranges += 1
            # Check if any pred event exactly matches gold start & end
            for g in gold_events:
                if any(p["start"] == g["start"] and p["end"] == g["end"] for p in pred_events):
                    exact_range_matches += 1
                    break

        for g in gold_events:
            matched = False
            for p in pred_events:
                # Precision match: check start date
                if p["start"] == g["start"]:
                    matched = True
                    break
            if matched:
                true_positives += 1
                results_by_lang[lang]["tp"] += 1

    precision = (true_positives / total_pred_events) if total_pred_events > 0 else 0.0
    recall = (true_positives / total_gold_events) if total_gold_events > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    range_exact_match_acc = (exact_range_matches / total_gold_ranges) if total_gold_ranges > 0 else 0.0

    eval_summary = {
        "total_benchmark_sentences": len(benchmark),
        "total_gold_events": total_gold_events,
        "total_pred_events": total_pred_events,
        "true_positives": true_positives,
        "date_precision": round(precision, 4),
        "date_recall": round(recall, 4),
        "date_f1": round(f1, 4),
        "total_gold_ranges": total_gold_ranges,
        "exact_range_matches": exact_range_matches,
        "range_exact_match_accuracy": round(range_exact_match_acc, 4),
        "per_language_metrics": {}
    }

    for l, metrics in results_by_lang.items():
        lp = metrics["tp"] / metrics["pred"] if metrics["pred"] > 0 else 0.0
        lr = metrics["tp"] / metrics["gold"] if metrics["gold"] > 0 else 0.0
        lf1 = 2 * lp * lr / (lp + lr) if (lp + lr) > 0 else 0.0
        eval_summary["per_language_metrics"][l] = {
            "gold": metrics["gold"],
            "pred": metrics["pred"],
            "tp": metrics["tp"],
            "precision": round(lp, 4),
            "recall": round(lr, 4),
            "f1": round(lf1, 4)
        }

    results_file = Path(__file__).parent / "results" / "15-calendar.json"
    results_file.parent.mkdir(parents=True, exist_ok=True)
    with open(results_file, "w", encoding="utf-8") as f:
        json.dump(eval_summary, f, indent=2)

    print("==================================================")
    print("FEATURE 15: CALENDAR EXTRACTION EVALUATION RESULTS")
    print("==================================================")
    print(f"Total Sentences: {len(benchmark)}")
    print(f"Precision:       {precision * 100:.2f}%")
    print(f"Recall:          {recall * 100:.2f}%")
    print(f"F1 Score:        {f1 * 100:.2f}%")
    print(f"Range Accuracy:  {range_exact_match_acc * 100:.2f}% ({exact_range_matches}/{total_gold_ranges})")
    print(f"Results saved to: {results_file}")
    print("==================================================")

if __name__ == "__main__":
    run_calendar_eval()
