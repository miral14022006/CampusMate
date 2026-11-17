import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure nlp-service root is in sys.path
NLP_SERVICE_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
if str(NLP_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(NLP_SERVICE_DIR))

from features.f10_retrain_data.export import export_retraining_data
from features.f10_retrain_data.retrain import run_retrain
from features.f03_transformer_intent.inference import MurilIntentClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval_feedback_loop")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "datasets"
RESULTS_DIR = PROJECT_ROOT / "eval" / "results"

# Realistic simulated user feedbacks (both explicit thumbs down and implicit failure edge-cases)
SIMULATED_FEEDBACKS = [
    {
        "query": "Bhai supplementary exam fees bharvani last date su che?",
        "language": "gu-Latn",
        "rating": "down",
        "reason": "wrong answer",
        "correctIntent": "exam_form_deadline",
        "correctDoc": "exam_circular_2024.pdf",
        "retrievedChunks": ["chunk_lib_01", "chunk_fee_99"]
    },
    {
        "query": "Is there any bus service available from satellite to campus morning shift?",
        "language": "en",
        "rating": "down",
        "reason": "wrong answer",
        "correctIntent": "bus_transport",
        "correctDoc": "bus_routes_schedule_2024.pdf",
        "retrievedChunks": ["chunk_hostel_05"]
    },
    {
        "query": "BTech mechanical 3rd semester nu syllabus link aapo portal par",
        "language": "gu-Latn",
        "rating": "down",
        "reason": "wrong answer",
        "correctIntent": "syllabus",
        "correctDoc": "syllabus_btech_mech.pdf",
        "retrievedChunks": ["chunk_admiss_01"]
    },
    {
        "query": "Hostel room transfer application format kya hai?",
        "language": "hi-Latn",
        "rating": "down",
        "reason": "outdated",
        "correctIntent": "hostel",
        "correctDoc": "hostel_rules_2024.pdf",
        "retrievedChunks": ["chunk_fee_02"]
    },
    {
        "query": "Re checking form submit karvani last date kai che diploma ma?",
        "language": "gu-Latn",
        "rating": "implicit_failure",
        "reason": "implicit_low_confidence",
        "correctIntent": "re_evaluation",
        "correctDoc": "exam_circular_2024.pdf",
        "retrievedChunks": ["chunk_eval_01"]
    },
    {
        "query": "How many books can a student issue from central library for 15 days?",
        "language": "en",
        "rating": "implicit_failure",
        "reason": "implicit_fallback",
        "correctIntent": "library_timings",
        "correctDoc": "library_handbook_2024.pdf",
        "retrievedChunks": ["chunk_lib_03"]
    },
    {
        "query": "Placement record CSE aur highest package kitna tha 2023 batch ka?",
        "language": "hi-Latn",
        "rating": "down",
        "reason": "not helpful",
        "correctIntent": "placement",
        "correctDoc": "placement_report_2023.pdf",
        "retrievedChunks": ["chunk_admission_04"]
    },
    {
        "query": "Bonafide certificate pass mate kevi rite apply karvu BTech ma?",
        "language": "gu-Latn",
        "rating": "implicit_failure",
        "reason": "implicit_idk",
        "correctIntent": "bonafide_certificate",
        "correctDoc": "academic_handbook_2024.pdf",
        "retrievedChunks": ["chunk_cert_01"]
    },
    {
        "query": "Direct second year admission eligibility criteria for diploma to degree",
        "language": "en",
        "rating": "down",
        "reason": "wrong answer",
        "correctIntent": "admission",
        "correctDoc": "admission_brochure_2024.pdf",
        "retrievedChunks": ["chunk_admin_01"]
    },
    {
        "query": "Mid semester attendance 75 percent nathi to hall ticket malse?",
        "language": "gu-Latn",
        "rating": "down",
        "reason": "wrong answer",
        "correctIntent": "attendance_rules",
        "correctDoc": "academic_regulations_2024.pdf",
        "retrievedChunks": ["chunk_attend_01"]
    }
]

def run_feedback_loop_eval():
    logger.info("Starting Feature 10 Feedback Loop Evaluation & Retraining cycle...")
    
    # 1. Baseline Model Metrics (Pre-Feedback)
    baseline_classifier = MurilIntentClassifier()
    df_test = pd.read_csv(DATA_DIR / "test.csv")
    
    logger.info(f"Evaluating Baseline Model on {len(df_test)} test queries...")
    baseline_correct = 0
    for _, row in df_test.iterrows():
        res = baseline_classifier.predict(str(row["text"]))
        pred_intent = res.get("intent")
        if pred_intent == row["intent"]:
            baseline_correct += 1
    baseline_acc = baseline_correct / len(df_test)
    
    # Test on the targeted hard feedback queries before retrain
    hard_pre_correct = 0
    for fb in SIMULATED_FEEDBACKS:
        res = baseline_classifier.predict(fb["query"])
        pred = res.get("intent")
        if pred == fb["correctIntent"]:
            hard_pre_correct += 1
    hard_pre_acc = hard_pre_correct / len(SIMULATED_FEEDBACKS)
    
    # 2. Run Export & Leakage Protection
    logger.info("Executing feedback export with test/val leakage verification...")
    export_summary = export_retraining_data(
        raw_approved_feedback=SIMULATED_FEEDBACKS,
        output_csv=DATA_DIR / "feedback_train.csv",
        merged_train_csv=DATA_DIR / "train_merged.csv",
        retrieval_pairs_json=DATA_DIR / "retrieval_hard_pairs.json",
        test_csv=DATA_DIR / "test.csv",
        val_csv=DATA_DIR / "val.csv",
        train_csv=DATA_DIR / "train.csv"
    )
    
    # 3. Trigger Retrain Pipeline
    model_version = f"v2_feedback_loop_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    logger.info(f"Retraining Intent Classifier with merged data -> version: {model_version}...")
    retrain_metrics = run_retrain(
        train_csv=DATA_DIR / "train_merged.csv",
        val_csv=DATA_DIR / "val.csv",
        test_csv=DATA_DIR / "test.csv",
        version_tag=model_version
    )
    
    # 4. Evaluate Retrained Model
    logger.info("Evaluating Retrained Model on test set & feedback cohort...")
    new_classifier = MurilIntentClassifier()
    new_classifier.load()
    
    new_correct = 0
    for _, row in df_test.iterrows():
        res = new_classifier.predict(str(row["text"]))
        pred_intent = res.get("intent")
        if pred_intent == row["intent"]:
            new_correct += 1
    retrained_test_acc = new_correct / len(df_test)
    
    # Hard feedback accuracy after retraining
    hard_post_correct = 0
    for fb in SIMULATED_FEEDBACKS:
        res = new_classifier.predict(fb["query"])
        pred = res.get("intent")
        if pred == fb["correctIntent"]:
            hard_post_correct += 1
    hard_post_acc = hard_post_correct / len(SIMULATED_FEEDBACKS)
    
    # Compile Results
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "feature": "10-feedback-retraining-pipeline",
        "simulation_note": "Simulated feedback: 10 production-like user thumbs-down and auto-logged failure edge queries were curated in the review queue and merged into the training set.",
        "baseline_model": {
            "version": "v1_muril_baseline",
            "test_accuracy": round(baseline_acc, 4),
            "hard_feedback_queries_accuracy": round(hard_pre_acc, 4)
        },
        "retrained_model": {
            "version": model_version,
            "test_accuracy": round(retrained_test_acc, 4),
            "val_accuracy": retrain_metrics.get("val_accuracy"),
            "test_ece": retrain_metrics.get("test_ece"),
            "hard_feedback_queries_accuracy": round(hard_post_acc, 4)
        },
        "delta_performance": {
            "test_accuracy_delta": round(retrained_test_acc - baseline_acc, 4),
            "feedback_cohort_improvement": f"+{((hard_post_acc - hard_pre_acc) * 100):.1f}%"
        },
        "dataset_statistics": export_summary
    }
    
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = RESULTS_DIR / "10-feedback-loop.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    logger.info(f"Evaluation results successfully saved to {json_path}")
    print("\n================== FEEDBACK RETRAINING RESULTS ==================")
    print(json.dumps(results, indent=2))
    print("=================================================================\n")
    return results

if __name__ == "__main__":
    run_feedback_loop_eval()
