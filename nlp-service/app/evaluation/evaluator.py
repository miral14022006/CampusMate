import json
import os
import time
from typing import Dict, Any
from app.nlp.language_detection import detect_language
from app.nlp.intent_classifier import intent_classifier
from app.retrieval.hybrid_retriever import hybrid_retriever
from app.services.chat_service import process_query

def run_evaluation() -> Dict[str, Any]:
    dataset_path = os.path.join(os.path.dirname(__file__), "../../data/evaluation/eval_dataset_210.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total = len(data)
    correct_lang = 0
    correct_intent = 0
    latencies = []

    print(f"Running evaluation benchmark on {total} queries...")

    for item in data:
        q = item["query"]
        expected_lang = item["expected_language"]
        expected_intent = item["expected_intent"]

        t0 = time.time()
        # 1. Language detection test
        lang_res = detect_language(q)
        detected_lang = lang_res["language"]
        if detected_lang == expected_lang or (expected_lang in ["hi", "hinglish"] and detected_lang in ["hi", "hinglish"]):
            correct_lang += 1

        # 2. Intent classification test
        intent_res = intent_classifier.classify(q)
        if intent_res["intent"] == expected_intent:
            correct_intent += 1

        latencies.append((time.time() - t0) * 1000)

    # 3. Retrieval Benchmark (TF-IDF vs Hybrid) on factual questions
    known_queries = [
        ("When is the Scientific Writing and Publication Ethics exam?", "FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf"),
        ("What is the course code for Numerical Methods & Computer Programming?", "FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf"),
        ("When was Independence Day holiday in 2024?", "List_of_General_Holidays-2024_1795166011274.pdf"),
        ("When is the Final Dissertation Submission for UG and PG for FoLS?", "ACADEMIC_CALENDAR_2026-27_1795164746429.pdf")
    ]

    tfidf_hits = 0
    hybrid_hits = 0

    for kq, target_doc in known_queries:
        r_tfidf = hybrid_retriever.search(kq, top_k=3, method="tfidf")
        if any(target_doc in chunk["filename"] for chunk, _ in r_tfidf):
            tfidf_hits += 1

        r_hybrid = hybrid_retriever.search(kq, top_k=3, method="hybrid")
        if any(target_doc in chunk["filename"] for chunk, _ in r_hybrid):
            hybrid_hits += 1

    report = {
        "total_queries_evaluated": total,
        "language_detection_accuracy": round((correct_lang / total) * 100, 2),
        "intent_classification_accuracy": round((correct_intent / total) * 100, 2),
        "avg_pipeline_latency_ms": round(sum(latencies) / len(latencies), 2),
        "p95_pipeline_latency_ms": round(sorted(latencies)[int(0.95 * len(latencies))], 2),
        "retrieval_comparison": {
            "tfidf_recall_at_3": round((tfidf_hits / len(known_queries)) * 100, 2),
            "hybrid_rrf_recall_at_3": round((hybrid_hits / len(known_queries)) * 100, 2)
        }
    }
    return report

if __name__ == "__main__":
    report = run_evaluation()
    print("\n" + "=" * 50)
    print("CAMPUSMATE MULTILINGUAL EVALUATION REPORT")
    print("=" * 50)
    print(json.dumps(report, indent=2))
