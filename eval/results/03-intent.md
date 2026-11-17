# Transformer Intent Classifier Benchmark (Feature 03 vs Baseline)

Evaluated on `255` held-out test queries across 20 intents and 5 language formats.

| Model Architecture | Accuracy | Macro-F1 | ECE (Calibration) | Avg Latency (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline (TF-IDF + LR)** | **28.24%** | **0.3588** | N/A | **0.663 ms** |
| **Google MuRIL Transformer** | **95.29%** | **0.9569** | **0.1840** | **1.504 ms** |

### Accuracy Breakdown by Language Style

| Language Style | Samples | Baseline Accuracy | MuRIL Accuracy | Delta Gain |
| :--- | :--- | :--- | :--- | :--- |
| `en` | 59 | 28.8% | **91.5%** | **+62.71%** |
| `gu` | 50 | 26.0% | **94.0%** | **+68.00%** |
| `gu-Latn` | 41 | 34.2% | **97.6%** | **+63.41%** |
| `hi` | 60 | 16.7% | **96.7%** | **+80.00%** |
| `hi-Latn` | 45 | 40.0% | **97.8%** | **+57.78%** |