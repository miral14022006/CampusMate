# Retrieval Performance Comparison (Feature 01 vs Baseline)

Evaluated on `125` multi-dialect queries (English, Hindi, Gujarati, Hinglish, Gujlish).

| Retrieval Pipeline | Recall@1 | Recall@3 | Recall@5 | MRR | Avg Latency (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TF-IDF Baseline** | **45.60%** | **64.80%** | **72.80%** | **0.5616** | **0.249 ms** |
| **BM25** | **45.60%** | **63.20%** | **72.00%** | **0.5511** | **0.147 ms** |
| **Dense (Multilingual e5)** | **28.80%** | **48.00%** | **63.20%** | **0.4101** | **35.764 ms** |
| **Hybrid (BM25 + Dense RRF)** | **41.60%** | **54.40%** | **70.40%** | **0.5063** | **8.689 ms** |
| **Hybrid + Cross-Encoder Rerank** | **36.80%** | **49.60%** | **65.60%** | **0.4597** | **124.778 ms** |