import sys
from pathlib import Path
import json

# Ensure nlp-service and project root are in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
NLP_SERVICE_DIR = PROJECT_ROOT / "nlp-service"
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(NLP_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(NLP_SERVICE_DIR))

def is_implicit_failure(nlp_data):
    conf = float(nlp_data.get("confidence", 0.0))
    decision = str(nlp_data.get("decision", "ANSWER")).upper()
    intent = str(nlp_data.get("intent", "")).lower()
    answer = str(nlp_data.get("answer", "")).lower()

    if 0 < conf < 0.50:
        return {"isFailure": True, "reason": "implicit_low_confidence"}
    if decision in ["CLARIFY", "FALLBACK"]:
        return {"isFailure": True, "reason": "implicit_fallback"}
    if intent == "out_of_scope":
        return {"isFailure": True, "reason": "implicit_fallback"}
    if "i do not have sufficient information" in answer or "no_answer" in answer:
        return {"isFailure": True, "reason": "implicit_idk"}
    return {"isFailure": False, "reason": None}
from features.f10_retrain_data.leakage_checker import check_dataset_leakage
import pandas as pd

def demo_feedback_lifecycle():
    print("=" * 65)
    print("DEMO: Feature 10 End-to-End Feedback & Continuous Retraining Loop")
    print("=" * 65)
    
    # 1. Implicit Failure Detection
    print("\n--- 1. Automatic Implicit Failure Detection ---")
    mock_responses = [
        {"intent": "syllabus", "confidence": 0.88, "decision": "ANSWER", "answer": "Here is the syllabus."},
        {"intent": "exam_form_deadline", "confidence": 0.35, "decision": "ANSWER", "answer": "Exam date might be soon."},
        {"intent": "hostel", "confidence": 0.62, "decision": "CLARIFY", "answer": "Did you mean hostel admission or mess fee?"},
        {"intent": "out_of_scope", "confidence": 0.15, "decision": "FALLBACK", "answer": "I do not have sufficient information."}
    ]
    for resp in mock_responses:
        chk = is_implicit_failure(resp)
        status = "⚠️ FLAGGED" if chk["isFailure"] else "✅ OK"
        print(f"[{status}] Intent: {resp['intent']:<20} Conf: {resp['confidence']:<4} Dec: {resp['decision']:<8} -> Reason: {chk['reason']}")

    # 2. Leakage Protection Check
    print("\n--- 2. Dataset Leakage Detection Before Model Merging ---")
    mock_test = pd.DataFrame([
        {"text": "BTech computer engineering fees and payment structure", "intent": "fee_structure", "language": "en"}
    ])
    incoming_feedbacks = [
        {"query": "BTech computer engineering fees and payment structure", "intent": "fee_structure"}, # Exact test leak
        {"query": "What are the timings for girls hostel night gate?", "intent": "hostel"} # Clean new sample
    ]
    clean, leaked = check_dataset_leakage(incoming_feedbacks, mock_test)
    print(f"Incoming: {len(incoming_feedbacks)} | Clean Approved: {len(clean)} | Blocked Leaks: {len(leaked)}")
    for lk in leaked:
        print(f"  [REJECTED LEAK]: \"{lk['query']}\" -> ({lk['leakage_reason']})")
    for cl in clean:
        print(f"  [ACCEPTED SAMPLE]: \"{cl['query']}\"")

    # 3. Benchmark Metrics
    results_path = Path(__file__).resolve().parent.parent / "eval" / "results" / "10-feedback-loop.json"
    if results_path.exists():
        with open(results_path, "r", encoding="utf-8") as f:
            res = json.load(f)
        print("\n--- 3. Evaluation & Retraining Performance Delta ---")
        print(f"Baseline Test Accuracy   : {res['baseline_model']['test_accuracy'] * 100:.2f}%")
        print(f"Retrained Test Accuracy  : {res['retrained_model']['test_accuracy'] * 100:.2f}%")
        print(f"Feedback Hard Cohort Acc : {res['baseline_model']['hard_feedback_queries_accuracy'] * 100:.1f}% -> {res['retrained_model']['hard_feedback_queries_accuracy'] * 100:.1f}% ({res['delta_performance']['feedback_cohort_improvement']})")
        print(f"Calibration Test ECE     : {res['retrained_model']['test_ece']:.4f}")
    
    print("\nDemo completed successfully!\n")

if __name__ == "__main__":
    demo_feedback_lifecycle()
