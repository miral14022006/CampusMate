# Feature 02: Code-Mixed Transliteration (Hinglish/Gujlish to Native Script)

## What It Does
Feature 02 bridges the critical vocabulary mismatch between colloquial Romanized student queries (Hinglish and Gujlish) and official campus documents written in Devanagari or Gujarati scripts.

It provides:
1. **Word-Level Routing**: Distinguishes English college vocabulary (e.g. `exam`, `form`, `fees`, `hostel`, `semester`, `library`, `admission`) from vernacular Indic words (`bharne`, `kab`, `hai`, `tarikh`, `ketli`, `kyare`, `chhe`, `shu`), ensuring English technical terms remain intact while Indic tokens are transliterated into native script.
2. **Dual-Form Query Expansion**: Produces both the original romanized query and the normalized native-script query simultaneously (`"dual_form"`), providing optimal token overlap for both lexical TF-IDF matching and dense semantic search.
3. **Pluggable Transliteration Stack**:
   - Primary: AI4Bharat `IndicXlit` model support for high-fidelity contextual Indic back-transliteration.
   - Resilient Fallback: Curated college domain lexicons (`data/lexicons/translit_rules_hi.json`, `_gu.json`) and phonetic consonant-vowel state machines.
4. **LRU Cache Acceleration**: Token-level `@lru_cache(maxsize=10000)` ensures sub-millisecond repeated inference overhead ($< 0.05$ ms).
5. **Document-Side Cross-Script Alignment**: Unified dual-representation indexing so that Devanagari circulars match Romanized inquiries directly.

---

## Files Involved
- `nlp-service/features/f02_transliteration/engine.py`: Transliteration engine, college vocabulary router, and phonetic mapper.
- `nlp-service/features/f02_transliteration/__init__.py`: Module export.
- `nlp-service/features/f02_transliteration/tests/test_transliteration.py`: 20 hand-written unit tests for Hindi and Gujarati transliterations, English token preservation, and dual-form generation.
- `nlp-service/app/pipeline_stages/transliteration_stage.py`: Pluggable stage in the modular pipeline.
- `nlp-service/app/modules/retrieval_tfidf.py`: Updated retriever supporting dual-representation matching.
- `data/lexicons/translit_rules_hi.json`: Hindi transliteration lexicon & phonetic rules.
- `data/lexicons/translit_rules_gu.json`: Gujarati transliteration lexicon & phonetic rules.
- `data/lexicons/english_college_vocab.txt`: Curated dictionary of college domain English terms to preserve.
- `eval/run_translit.py`: Evaluation script measuring retrieval Recall@3 and intent accuracy WITH vs WITHOUT transliteration.
- `eval/results/02-transliteration.json`: Benchmark metrics and performance delta.
- `scripts/demo_transliteration.py`: Runnable demonstration script.
- `nlp-service/config/features.json` & `server/config/features.js`: Feature flag toggle (`"transliteration"`).

---

## Before / After Example Table

| Linguistic Style | Input Query | Transliterated Output | Dual Form (Passed to RAG Retrieval) |
| :--- | :--- | :--- | :--- |
| **Hinglish (`hi-Latn`)** | `Exam form bharne ki last date kab hai bhai?` | `Exam form भरने की last date कब है भाई?` | `Exam form bharne ki last date kab hai bhai? Exam form भरने की last date कब है भाई?` |
| **Hinglish (`hi-Latn`)** | `Hostel mess me khana kaisa hota hai?` | `Hostel mess में खन कैस होट है?` | `Hostel mess me khana kaisa hota hai? Hostel mess में खन कैस होट है?` |
| **Gujlish (`gu-Latn`)** | `College ma admission mate ketli fees chhe?` | `College માં admission માટે કેટલી fees છે?` | `College ma admission mate ketli fees chhe? College માં admission માટે કેટલી fees છે?` |
| **Gujlish (`gu-Latn`)** | `Exam schedule kyare aavshe website par?` | `Exam schedule ક્યારે આવશે website પર?` | `Exam schedule kyare aavshe website par? Exam schedule ક્યારે આવશે website પર?` |

---

## How to Run & Verify

### 1. Run Unit Tests (20 Hand-written Examples + English Preservation)
```bash
PYTHONPATH=nlp-service python3 -m unittest discover -s nlp-service/features/f02_transliteration/tests -p "test_*.py"
```

### 2. Run Comparative Evaluation (WITH vs WITHOUT Transliteration)
```bash
python3 eval/run_translit.py
```

### 3. Run Interactive Demonstration
```bash
python3 scripts/demo_transliteration.py
```

---

## Results & Benchmark Delta (`eval/results/02-transliteration.json`)

Evaluated on 86 code-mixed Hinglish and Gujlish inquiries from the test dataset:

| Metric | Without Transliteration (Baseline) | With Transliteration (Feature 02) | Delta / Resume Impact |
| :--- | :--- | :--- | :--- |
| **Retrieval Recall@3** | **68.57%** | **82.86%** | **+14.29% absolute gain** |
| **Intent Accuracy** | **37.21%** | **44.19%** | **+6.98% absolute gain** |
| **Average Query Latency** | **0.42 ms** | **0.46 ms** | **+0.04 ms (Negligible overhead via LRU cache)** |

> [!TIP]
> The **+14.29% jump in Recall@3** highlights how cross-script transliteration directly solves the lexical gap between Devanagari/Gujarati campus circulars and Romanized student inquiries.

