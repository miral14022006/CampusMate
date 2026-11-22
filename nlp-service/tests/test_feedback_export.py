import pandas as pd
from features.f10_retrain_data.leakage_checker import check_dataset_leakage, normalize_for_comparison
from features.f10_retrain_data.export import export_retraining_data

def test_normalize_for_comparison():
    assert normalize_for_comparison("  Hello, World!  ") == "hello world"
    assert normalize_for_comparison("Exam Date???") == "exam date"

def test_exact_leakage_detection():
    test_df = pd.DataFrame([
        {"text": "What is the fee for BTech computer science?", "intent": "fee_structure", "language": "en"}
    ])
    val_df = pd.DataFrame([
        {"text": "Hostel room booking procedure kya hai?", "intent": "hostel", "language": "hi-Latn"}
    ])
    
    new_samples = [
        # Exactly matches test set query
        {"query": "What is the fee for BTech computer science?", "intent": "fee_structure", "language": "en"},
        # Distinct clean query
        {"query": "How many buses run in morning shift?", "intent": "bus_transport", "language": "en"}
    ]
    
    clean, leaked = check_dataset_leakage(new_samples, test_df, val_df)
    
    assert len(clean) == 1
    assert clean[0]["query"] == "How many buses run in morning shift?"
    assert len(leaked) == 1
    assert leaked[0]["leakage_reason"] == "exact_match_with_held_out"

def test_fuzzy_leakage_detection():
    test_df = pd.DataFrame([
        {"text": "BTech computer science fees criteria and structure details", "intent": "fee_structure", "language": "en"}
    ])
    
    new_samples = [
        # Near duplicate of test sample
        {"query": "BTech computer science fees criteria structure details", "intent": "fee_structure", "language": "en"},
        # Completely distinct
        {"query": "Library return delay penalty fine rules", "intent": "library_timings", "language": "en"}
    ]
    
    clean, leaked = check_dataset_leakage(new_samples, test_df, similarity_threshold=90.0)
    
    assert len(clean) == 1
    assert clean[0]["query"] == "Library return delay penalty fine rules"
    assert len(leaked) == 1
    assert "fuzzy_similarity" in leaked[0]["leakage_reason"]

def test_export_retraining_data(tmp_path):
    output_csv = tmp_path / "test_feedback.csv"
    merged_csv = tmp_path / "test_merged.csv"
    retrieval_json = tmp_path / "test_retrieval.json"
    train_csv = tmp_path / "train.csv"
    test_csv = tmp_path / "test.csv"
    
    # Create mock train and test
    pd.DataFrame([
        {"text": "train sample 1", "intent": "hostel", "language": "en"},
        {"text": "train sample 2", "intent": "admission", "language": "en"}
    ]).to_csv(train_csv, index=False)
    
    pd.DataFrame([
        {"text": "test sample leak", "intent": "hostel", "language": "en"}
    ]).to_csv(test_csv, index=False)
    
    approved_feedback = [
        {"query": "test sample leak", "correctIntent": "hostel", "language": "en"}, # Should be dropped
        {"query": "new valid user query", "correctIntent": "placement", "language": "en", "rating": "down", "correctDoc": "placement.pdf"}
    ]
    
    summary = export_retraining_data(
        raw_approved_feedback=approved_feedback,
        output_csv=output_csv,
        merged_train_csv=merged_csv,
        retrieval_pairs_json=retrieval_json,
        test_csv=test_csv,
        train_csv=train_csv
    )
    
    assert summary["clean_samples_retained"] == 1
    assert summary["leaked_samples_discarded"] == 1
    assert summary["merged_train_total"] == 3  # 2 original train + 1 clean
    assert output_csv.exists()
    assert merged_csv.exists()
    assert retrieval_json.exists()

