# Feature 00: Foundation & Baseline Pipeline

## What It Does
The Foundation module establishes the end-to-end baseline architecture for the **Multilingual College Assistant**. It supports student inquiries across English, Hindi, Gujarati, Hinglish (code-mixed Hindi-English), and Gujlish (code-mixed Gujarati-English). 

It implements an extensible sequential pipeline:
1. **Unicode NFC normalization, punctuation cleanup, and phonetic variant mapping** (e.g. `kab`/`kb`, `kyu`/`kyun`, `kya`/`kia`).
2. **Language and Script identification** separating native Devanagari and Gujarati scripts, plus lexicon frequency scoring for Latin script code-mixing.
3. **Intent classification** over 20 core college intents using character and word n-gram TF-IDF paired with Logistic Regression.
4. **Entity Extraction** for `COURSE`, `SEMESTER`, `BRANCH`, `EXAM_TYPE`, and `DATE` using custom regex patterns and entity ruler structures.
5. **Document Ingestion & Retrieval** indexing college circulars and regulations using sublinear TF-IDF and cosine similarity.
6. **Extractive and Template Response generation** adhering to user language and returning source document attribution.
7. **Full-stack integration** connecting a FastAPI microservice, Node.js/Express API Gateway with MongoDB schema persistence, and a React + Vite + Tailwind chat UI.

---

## Files Involved

### NLP Microservice (`nlp-service/`)
- `app/config.py`: Core paths, confidence thresholds, and retrieval hyperparameters.
- `app/schemas.py`: Pydantic typing models (`QueryRequest`, `QueryResponse`, `PipelineResult`, `EntityMatch`, `RetrievedChunk`).
- `app/pipeline.py`: Orchestrator connecting preprocessing, language ID, intent, entities, retrieval, and answering.
- `app/main.py`: FastAPI server exposing `/health` and `POST /baseline/query`.
- `app/modules/preprocessing.py`: NFC normalization, stopword filtering, and spelling variant dictionary lookup.
- `app/modules/language_detect.py`: Unicode script range detector and Hinglish/Gujlish lexicon scorer.
- `app/modules/intent_baseline.py`: 20-intent classifier with TF-IDF char/word n-grams and Logistic Regression (`train`/`predict` CLI).
- `app/modules/entities.py`: Multi-pattern entity extractor for courses, branches, semesters, dates, and exam types.
- `app/modules/ingest.py`: PDF/DOCX/TXT parser with paragraph sliding-window chunking and metadata preservation.
- `app/modules/retrieval_tfidf.py`: TF-IDF vectorizer and cosine similarity index over parsed chunks.
- `app/modules/answer_template.py`: Extractive best-sentence selector and multilingual intent response templates.
- `cli.py`: Standalone CLI to run queries directly against the pipeline.

### Data Assets (`data/`)
- `data/intents.json`: 20 official college intents and definitions.
- `data/lexicons/variants.json`: Colloquial phonetic transliteration normalizer dictionary.
- `data/lexicons/hinglish_words.txt`: Hinglish marker vocabulary.
- `data/lexicons/gujlish_words.txt`: Gujlish marker vocabulary.
- `data/stopwords/{en,hi,gu}.txt`: Language-specific stopword lists.
- `data/patterns/{en,hi,gu}_patterns.json`: Entity recognition patterns.
- `data/datasets/seed_queries.csv`: Seed dataset containing 200 queries (10 per intent across language styles).
- `data/raw/`: 5 realistic college circulars (exam notice, fee notice, academic calendar, hostel rules, library rules).
- `data/templates/intent_responses.json`: Verified multilingual answers for all 20 intents in English, Hindi, and Gujarati.

### Server Gateway (`server/`)
- `server/server.js`: Express gateway with health check and Mongoose connection.
- `server/routes/chat.js`: Chat router forwarding requests to FastAPI `/baseline/query` and persisting conversation state.
- `server/models/Message.js`: Mongoose message schema with language, intent, confidence, and entity fields.
- `server/models/Conversation.js`: Mongoose conversation thread schema.

### Client UI (`client/`)
- `client/src/features/chat/ChatWindow.jsx`: Chat interface featuring message bubbles, language badges, intent tags, source chips, and quick queries.
- `client/src/App.jsx`: CampusMate layout container.

### Evaluation & Demo (`eval/`, `scripts/`)
- `eval/run_baseline.py`: Evaluation harness computing language accuracy, intent macro-F1, Recall@3, and MRR.
- `eval/results/00-baseline.json`: Measured metrics written by the evaluation script.
- `scripts/demo_foundation.py`: Standalone runnable demo testing 5 sample queries across all 5 language styles.

---

## API Endpoints

### 1. `POST /baseline/query` (FastAPI - Port 8000)
- **Request Body**:
  ```json
  {
    "query": "Exam form bharne ki last date kya hai?"
  }
  ```
- **Response Body**:
  ```json
  {
    "answer": "Students must verify all enrolled course codes, branch details, and elective subjects before final submission of the exam form.",
    "language": "hi-Latn",
    "intent": "exam_form_deadline",
    "confidence": 0.807,
    "source_doc": "01_exam_notice_en.txt",
    "pipeline_details": {
      "raw_query": "Exam form bharne ki last date kya hai?",
      "normalized_query": "exam form bharne ki last date kya hai",
      "tokens": ["exam", "form", "bharne", "ki", "last", "date", "kya", "hai"],
      "detected_language": "hi-Latn",
      "script": "Latin",
      "language_confidence": 0.97,
      "intent": "exam_form_deadline",
      "intent_confidence": 0.807,
      "is_fallback_intent": false,
      "entities": [],
      "retrieved_chunks": [
        {
          "chunk_id": "01_exam_notice_en.txt_p1_c1",
          "doc_name": "01_exam_notice_en.txt",
          "page": 1,
          "score": 0.2304,
          "text": "..."
        }
      ],
      "execution_time_ms": 6.47
    }
  }
  ```

### 2. `POST /api/chat` (Express API Gateway - Port 5000)
- **Request Body**:
  ```json
  {
    "query": "What is the fee structure for BTech Computer Engineering?",
    "sessionId": "session_user_001"
  }
  ```
- **Response Body**:
  ```json
  {
    "sessionId": "session_user_001",
    "answer": "The annual tuition fee for BTech Computer Engineering... is Rs 85,000 per academic year.",
    "language": "en",
    "intent": "fee_structure",
    "confidence": 0.692,
    "source_doc": "02_fee_notice_en.txt",
    "entities": [
      { "label": "COURSE", "text": "BTech" },
      { "label": "BRANCH", "text": "Computer Engineering" }
    ]
  }
  ```

---

## How to Run & Verify

### 1. Train Intent Model & Ingest Documents
```bash
PYTHONPATH=nlp-service python3 -m app.modules.intent_baseline train
PYTHONPATH=nlp-service python3 -m app.modules.ingest
PYTHONPATH=nlp-service python3 -m app.modules.retrieval_tfidf
```

### 2. Run CLI Pipeline Query
```bash
python3 nlp-service/cli.py "Exam form bharne ki last date kya hai?"
```

### 3. Run 5-Language End-to-End Demo
```bash
python3 scripts/demo_foundation.py
```

### 4. Run Baseline Evaluation Suite
```bash
python3 eval/run_baseline.py
```

---

## Results (Written to `eval/results/00-baseline.json`)

The baseline evaluation was executed against the 200-sample seed dataset (`data/datasets/seed_queries.csv`) across all 20 intents and 5 language styles:

| Evaluation Metric | Baseline Value | Interpretation |
| :--- | :--- | :--- |
| **Language-ID Accuracy** | **98.50%** | Robust script detection + transliteration lexicon scoring |
| **Language-ID Latency** | **0.007 ms** | Sub-millisecond dialect classification |
| **Intent Accuracy** | **100.00%** | Logistic Regression on char (3-5) + word (1-2) TF-IDF |
| **Intent Macro-F1** | **1.0000** | Equalized class weights over all 20 intents |
| **Intent Inference Latency** | **0.015 ms** | Ultra-low latency CPU inference |
| **Retrieval Recall@3** | **63.75%** | Baseline TF-IDF retrieval across parsed college circulars |
| **Retrieval MRR** | **0.5667** | Mean Reciprocal Rank on top documents |

> [!NOTE]
> These verified numbers provide the measurable benchmark. Subsequent upgrades (dense neural embeddings, hybrid BM25 + bi-encoders, cross-encoder rerankers, and multilingual LLM generation) will directly improve upon the `63.75%` Retrieval Recall@3 baseline.

