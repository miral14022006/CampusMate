# Feature 03: Transformer Intent Classifier (Google MuRIL)

## What It Does
Feature 03 fine-tunes and deploys a state-of-the-art multilingual encoder (**Google MuRIL** - *Multilingual Representations for Indian Languages*, with support for `ai4bharat/IndicBERTv2-MLM-only`) over the 20 collegiate intents. It solves the vocabulary collapse of the baseline TF-IDF model by leveraging deep contextual Indic representations trained on Romanized and native script Indic corpora.

### Key Capabilities
1. **MuRIL Transformer Model Architecture**: Fine-tuned on `data/datasets/train.csv` (augmented with script-mixed transliterated pairs from Feature 02), validated on `val.csv`, and reported on the held-out `test.csv`.
2. **Dual-Script Training Augmentation**: Doubles code-mixed samples with native script equivalents (`"original + native"`), enabling the model to learn invariant representations across Devanagari, Gujarati script, and Latin transliteration.
3. **Common Classifier Interface (`BaseIntentClassifier`)**: Drop-in compatible with the baseline, returning `(intent, confidence, is_fallback, top3)`.
4. **Softmax Temperature Scaling Calibration**: Calibrates prediction confidence to minimize overconfidence on out-of-distribution queries, reporting **Expected Calibration Error (ECE)**.
5. **Colab-Ready Training Notebook (`notebooks/train_intent_muril.ipynb`)**: For GPU acceleration with Hugging Face `Trainer`, `EarlyStoppingCallback`, and metric evaluation.
6. **Detailed Error Analysis**: Script `eval/error_analysis_intent.py` lists the most confident mistakes to guide prompt engineering and continuous active learning.

---

## Files Involved
- `nlp-service/features/f03_transformer_intent/base.py`: Abstract Base Class for intent classifiers.
- `nlp-service/features/f03_transformer_intent/calibration.py`: Temperature scaling and Expected Calibration Error (ECE) implementation.
- `nlp-service/features/f03_transformer_intent/train.py`: Fine-tuning script with transliteration data augmentation and checkpoint persistence.
- `nlp-service/features/f03_transformer_intent/inference.py`: Production inference engine with temperature calibration and top-3 ranked predictions.
- `nlp-service/features/f03_transformer_intent/models/intent_muril/`: Checkpoint weights, vectorizer, and `config.json`.
- `nlp-service/features/f03_transformer_intent/tests/test_transformer_intent.py`: Unit tests verifying interface compliance, top-3 output structure, and calibration.
- `nlp-service/app/pipeline_stages/intent_stage.py`: Swappable pipeline stage toggling between `baseline` and `muril`.
- `notebooks/train_intent_muril.ipynb`: Google Colab GPU notebook.
- `eval/run_intent.py`: Comparative evaluation script generating benchmark tables, JSON metrics, and confusion matrix heatmap.
- `eval/error_analysis_intent.py`: Top-30 confident error analysis script.
- `eval/results/03-intent.json`: Quantitative benchmark metrics.
- `eval/results/03-intent.md`: Markdown comparison table.
- `eval/results/confusion_matrix.png`: Visual confusion matrix heatmap across all 20 intents.
- `eval/results/03-intent-errors.json`: Detailed error analysis report.
- `scripts/demo_transformer_intent.py`: Runnable CLI comparison demonstration.

---

## Benchmark Results (`eval/results/03-intent.md`)

Evaluated on **255 held-out test queries** across all 20 intents:

| Model Architecture | Accuracy | Macro-F1 | ECE (Calibration) | Avg Latency (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline (TF-IDF + LR)** | **28.24%** | **0.3588** | N/A | **0.663 ms** |
| **Google MuRIL Transformer** | **95.29%** | **0.9569** | **0.1840** | **1.504 ms** |

### Accuracy Breakdown by Language Style

| Language Style | Samples | Baseline Accuracy | MuRIL Accuracy | Delta Gain |
| :--- | :--- | :--- | :--- | :--- |
| `en` (English) | 59 | 28.8% | **91.5%** | **+62.71%** |
| `gu` (Gujarati script) | 50 | 26.0% | **94.0%** | **+68.00%** |
| `gu-Latn` (Gujlish) | 41 | 34.2% | **97.6%** | **+63.41%** |
| `hi` (Hindi Devanagari) | 60 | 16.7% | **96.7%** | **+80.00%** |
| `hi-Latn` (Hinglish) | 45 | 40.0% | **97.8%** | **+57.78%** |

---

## How to Run & Verify

### 1. Train or Re-Train MuRIL Checkpoint
```bash
PYTHONPATH=nlp-service python3 -m features.f03_transformer_intent.train
```

### 2. Run Feature 03 Unit Tests
```bash
PYTHONPATH=nlp-service python3 -m unittest discover -s nlp-service/features/f03_transformer_intent/tests -p "test_*.py"
```

### 3. Run Comparative Evaluation Suite & Confusion Matrix Generator
```bash
python3 eval/run_intent.py
```

### 4. Run Confident Error Analysis
```bash
python3 eval/error_analysis_intent.py
```

### 5. Run Live Comparison Demo
```bash
python3 scripts/demo_transformer_intent.py
```

