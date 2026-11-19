import json
import logging
from pathlib import Path
from typing import List, Dict, Any
import pandas as pd

from features.f10_retrain_data.leakage_checker import check_dataset_leakage

logger = logging.getLogger("export_feedback")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "data" / "datasets"
EVAL_DIR = PROJECT_ROOT / "eval"

def export_retraining_data(
    raw_approved_feedback: List[Dict[str, Any]],
    output_csv: Path = DATASETS_DIR / "feedback_train.csv",
    merged_train_csv: Path = DATASETS_DIR / "train_merged.csv",
    retrieval_pairs_json: Path = DATASETS_DIR / "retrieval_hard_pairs.json",
    test_csv: Path = DATASETS_DIR / "test.csv",
    val_csv: Path = DATASETS_DIR / "val.csv",
    train_csv: Path = DATASETS_DIR / "train.csv"
) -> Dict[str, Any]:
    """
    Exports approved feedback entries to dataset files with test/val set leakage checks.
    Also produces hard positive/negative pairs for retrieval fine-tuning.
    """
    logger.info(f"Processing {len(raw_approved_feedback)} approved feedback records...")
    
    # Load test & val sets for leakage verification
    df_test = pd.read_csv(test_csv) if test_csv.exists() else pd.DataFrame(columns=["text", "intent", "language"])
    df_val = pd.read_csv(val_csv) if val_csv.exists() else pd.DataFrame(columns=["text", "intent", "language"])
    
    # Run leakage detection
    clean_items, leaked_items = check_dataset_leakage(
        new_samples=raw_approved_feedback,
        test_df=df_test,
        val_df=df_val,
        similarity_threshold=88.0
    )
    
    if leaked_items:
        logger.warning(f"Blocked {len(leaked_items)} feedback samples due to test/validation leakage!")
        for lk in leaked_items:
            logger.warning(f"  Leakage: '{lk.get('query')}' -> reason: {lk.get('leakage_reason')}")
            
    logger.info(f"Accepted {len(clean_items)} clean training samples without leakage.")
    
    # Format intent dataset rows (text, intent, language)
    feedback_rows = []
    retrieval_pairs = []
    
    for item in clean_items:
        query = str(item.get("query", "")).strip()
        intent = str(item.get("correctIntent") or item.get("intent") or "out_of_scope").strip()
        lang = str(item.get("language") or "en").strip()
        
        if query and intent:
            feedback_rows.append({
                "text": query,
                "intent": intent,
                "language": lang
            })
            
        # Retrieval hard positive / negative generation
        # If user/admin flagged wrong doc or assigned correct doc
        correct_doc = item.get("correctDoc")
        retrieved_chunks = item.get("retrievedChunks", [])
        if correct_doc or (retrieved_chunks and item.get("rating") == "down"):
            retrieval_pairs.append({
                "query": query,
                "language": lang,
                "positive_doc": correct_doc,
                "hard_negative_chunks": retrieved_chunks if item.get("rating") == "down" else [],
                "reason": item.get("reason")
            })

    # 1. Save feedback_train.csv
    df_feedback = pd.DataFrame(feedback_rows)
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    df_feedback.to_csv(output_csv, index=False)
    logger.info(f"Saved {len(df_feedback)} feedback training samples to {output_csv}")
    
    # 2. Merge with original train.csv to create train_merged.csv
    df_train = pd.read_csv(train_csv) if train_csv.exists() else pd.DataFrame(columns=["text", "intent", "language"])
    df_merged = pd.concat([df_train, df_feedback], ignore_index=True)
    # Deduplicate on text
    df_merged = df_merged.drop_duplicates(subset=["text"]).reset_index(drop=True)
    df_merged.to_csv(merged_train_csv, index=False)
    logger.info(f"Merged training dataset created at {merged_train_csv} (Total samples: {len(df_merged)})")
    
    # 3. Save retrieval hard pairs
    with open(retrieval_pairs_json, "w", encoding="utf-8") as f:
        json.dump(retrieval_pairs, f, indent=2)
    logger.info(f"Saved {len(retrieval_pairs)} retrieval pairs to {retrieval_pairs_json}")
    
    summary = {
        "total_approved_input": len(raw_approved_feedback),
        "clean_samples_retained": len(clean_items),
        "leaked_samples_discarded": len(leaked_items),
        "feedback_csv_count": len(df_feedback),
        "merged_train_total": len(df_merged),
        "retrieval_pairs_count": len(retrieval_pairs),
        "feedback_csv_path": str(output_csv),
        "merged_csv_path": str(merged_train_csv),
        "retrieval_pairs_path": str(retrieval_pairs_json)
    }
    return summary

def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    
    # Sample fallback seed data if running CLI directly without live server export
    sample_approved_feedbacks = [
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
            "query": "Is there any bus service available from satellite to campus?",
            "language": "en",
            "rating": "down",
            "reason": "wrong answer",
            "correctIntent": "bus_transport",
            "correctDoc": "bus_routes_schedule_2024.pdf",
            "retrievedChunks": ["chunk_hostel_05"]
        },
        {
            "query": "BTech mechanical 3rd semester nu syllabus link aapo",
            "language": "gu-Latn",
            "rating": "down",
            "reason": "wrong answer",
            "correctIntent": "syllabus",
            "correctDoc": "syllabus_btech_mech.pdf",
            "retrievedChunks": ["chunk_admiss_01"]
        }
    ]
    
    summary = export_retraining_data(sample_approved_feedbacks)
    print("\n--- Feedback Export Summary ---")
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()

