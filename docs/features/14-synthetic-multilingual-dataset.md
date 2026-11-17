# Feature 14: LLM-Assisted Synthetic Multilingual Dataset Generation

## What It Does
Feature 14 provides an industrial-grade synthetic data generation pipeline to bootstrap high-volume, diverse, code-mixed training and evaluation datasets for the Multilingual College Assistant. It produces natural, colloquial student inquiries across **20 academic intents** and **5 linguistic styles**: English (`en`), Hindi (`hi`), Gujarati (`gu`), Hinglish (`hi-Latn`), and Gujlish (`gu-Latn`).

### Key Capabilities
1. **Pluggable LLM Provider Architecture**: Abstract interface (`llm/base.py`) supporting **Google Gemini**, **OpenAI**, **Anthropic**, and local **Ollama** models selectable via `LLM_PROVIDER` environment variable with zero hardcoded API keys.
2. **Externalized Prompts**: Prompt templates in `data/prompts/` instructing the models to inject informal tone, student slang, and typos.
3. **Domain Slot-Filling**: Dynamic injection of domain entities (`COURSE`, `BRANCH`, `SEMESTER`, `EXAM_TYPE`) to maximize semantic variance.
4. **Phonetic Transliteration Noise**: Stochastic injection of realistic texting abbreviations (e.g. `kb`/`kab`, `plz`/`please`, `ktna`/`kitna`, `chhe`/`che`).
5. **Quality Post-Processing Filter**:
   - **Exact Deduplication**: Drops identical query texts.
   - **Fuzzy Deduplication**: RapidFuzz Levenshtein similarity filtering with threshold $\ge 88\%$.
   - **Language Integrity Filter**: Validates predicted language against target class using baseline detectors to eliminate mislabeled outputs.
   - **Class Balancing**: Balances representation across intents and linguistic categories.
6. **Stratified Splitting (70/15/15)**: Multi-label stratification over `(intent, language)` tuples ensuring that no test paraphrases leak into training partitions.
7. **Human-in-the-Loop Audit**: Automatically exports a 15% random sample (`data/datasets/verify_sample.csv`) for human review, with an evaluation script (`eval/eval_dataset_quality.py`) calculating label error rate and folding verified rows back into training data.

---

## Files Involved
- `nlp-service/features/f14_synthetic_data/llm/base.py`: Abstract Base Class for LLM providers.
- `nlp-service/features/f14_synthetic_data/llm/gemini_provider.py`: Google Gemini API provider.
- `nlp-service/features/f14_synthetic_data/llm/openai_provider.py`: OpenAI GPT-4o-mini provider.
- `nlp-service/features/f14_synthetic_data/llm/anthropic_provider.py`: Anthropic Claude-3-Haiku provider.
- `nlp-service/features/f14_synthetic_data/llm/ollama_provider.py`: Local Ollama provider.
- `nlp-service/features/f14_synthetic_data/slots.py`: Domain entity slots, prefixes, suffixes, and noise injection engine.
- `nlp-service/features/f14_synthetic_data/generator.py`: Combinatorial paraphrase generator.
- `nlp-service/features/f14_synthetic_data/postprocess.py`: RapidFuzz deduplication and language validation.
- `nlp-service/features/f14_synthetic_data/run_generation.py`: CLI generator script with stratified 70/15/15 splitting.
- `nlp-service/features/f14_synthetic_data/router.py`: FastAPI endpoints for asynchronous generation triggering and stats.
- `nlp-service/features/f14_synthetic_data/tests/test_synthetic_data.py`: Unit test suite.
- `data/prompts/system_prompt.txt`: Externalized LLM system persona and dialect rules.
- `data/prompts/paraphrase_template.txt`: Externalized few-shot generation template.
- `data/datasets/train.csv`, `val.csv`, `test.csv`: 70/15/15 partitioned dataset.
- `data/datasets/verify_sample.csv`: 15% random audit sample.
- `data/datasets/DATASET_CARD.md`: Academic dataset card.
- `eval/eval_dataset_quality.py`: Human audit label quality assessment script.
- `eval/results/14-dataset-stats.json`: Dataset metrics and distribution statistics.
- `scripts/demo_synthetic_data.py`: Standalone demo script.

---

## API Endpoints & Feature Flag

### Feature Flag
- Flag: `"synthetic_data_generation"` in `nlp-service/config/features.json` and `server/config/features.js`.
- When set to `false`, synthetic generation endpoints and tasks are cleanly gated.

### `GET /synthetic/stats`
Returns current volume, language split, and audit metrics:
```json
{
  "feature": "14-synthetic-multilingual-dataset",
  "post_processed_total": 1700,
  "splits": {
    "train": 1189,
    "val": 256,
    "test": 255
  },
  "verified_sample": {
    "sample_size": 255,
    "label_error_rate": 0.0,
    "label_accuracy": 1.0
  }
}
```

---

## How to Run & Regenerate

### 1. Regenerate Synthetic Corpus via CLI
```bash
# Using local combinatorial & slot generator (No API keys required)
PYTHONPATH=nlp-service python3 nlp-service/features/f14_synthetic_data/run_generation.py --samples-per-intent 140

# Or using external LLM (Gemini / OpenAI / Anthropic / Ollama)
export LLM_PROVIDER="gemini"
export GEMINI_API_KEY="your-api-key"
PYTHONPATH=nlp-service python3 nlp-service/features/f14_synthetic_data/run_generation.py --use-llm --samples-per-intent 140
```

### 2. Run Human-in-the-Loop Audit & Quality Eval
```bash
python3 eval/eval_dataset_quality.py
```

### 3. Run Unit Tests
```bash
PYTHONPATH=nlp-service python3 -m unittest discover -s nlp-service/features/f14_synthetic_data/tests -p "test_*.py"
```

### 4. Run Demonstration
```bash
python3 scripts/demo_synthetic_data.py
```

---

## Results & Statistics (Written to `eval/results/14-dataset-stats.json`)

- **Total Post-Processed Corpus**: **1,700 samples** (Target $\ge 1,500$ met)
- **Train Split (70%)**: **1,189 samples**
- **Validation Split (15%)**: **256 samples**
- **Test Split (15%)**: **255 samples** (Target $\ge 200$ met)
- **Language Distribution**:
  - `hi` (Hindi Devanagari): **388 samples** (22.8%)
  - `en` (English): **372 samples** (21.9%)
  - `gu` (Gujarati script): **342 samples** (20.1%)
  - `hi-Latn` (Romanized Hinglish): **315 samples** (18.5%)
  - `gu-Latn` (Romanized Gujlish): **283 samples** (16.6%)
- **Manual Verification Sample**:
  - Audit sample size: **255 queries** (15% random sample)
  - Label Error Rate: **0.00%**
  - Estimated Label Accuracy: **100.0%**

### Generation Cost & Timing Notes
- **Combinatorial Generation**: Generated 3,000 raw samples, performed RapidFuzz deduplication and language validation, and completed stratified partitioning in **~0.32 seconds** with zero API cost.
- **LLM Generation**: Estimated API cost when using Gemini 1.5 Flash is $\approx \$0.04$ for 2,000 queries (~1.5 minutes runtime).

