# Feature 07: Production-Style REST API for NLP Service

## What It Does
Feature 07 upgrades the `nlp-service` into an enterprise-grade, high-throughput RESTful microservice with a decoupled **modular pipeline stage architecture**, header-based API key authentication, request correlation IDs, JSON structured logging with file rotation, real-time counters/metrics, and a production-grade resilient Node.js client service with retry and timeout mechanisms.

---

## Architectural Refactoring: Modular Pipeline Stages
The monolithic pipeline is now decomposed into atomic stages inheriting from an abstract `PipelineStage` interface (`app/pipeline_stages/base.py`):
1. **`LanguageStage`**: Identifies language (`en`, `hi`, `gu`, `hi-Latn`, `gu-Latn`) and normalizes phonetic variants.
2. **`TransliterationStage`**: Pluggable stage interface (currently a clean pass-through stub, to be populated in Feature 02).
3. **`IntentStage`**: Hybrid word + char n-gram TF-IDF and Logistic Regression prediction.
4. **`EntityStage`**: Regex and rule-based extraction for `COURSE`, `BRANCH`, `SEMESTER`, `EXAM_TYPE`, `DATE`.
5. **`RetrievalStage`**: Top-k cosine similarity retrieval over ingested college document chunks (gated dynamically via `rag_retrieval` in `features.json`).
6. **`AnswerStage`**: Extractive best-sentence selector with multilingual template fallback.

Stages are configured dynamically from `config/features.json` so future features (e.g. IndicBERT, Cross-Encoder Rerankers, Vector Databases) plug in as replacement stages without altering the external API contract.

---

## Files Involved

### NLP Microservice (`nlp-service/`)
- `app/core/config.py`: Environment configurations, authentication tokens, file paths, and hyperparameters.
- `app/core/security.py`: `RequestIDMiddleware`, `ErrorHandlingMiddleware`, and `verify_api_key` dependency.
- `app/core/logging_config.py`: Rotating JSON structured logger tracking per-stage latencies, request IDs, and query metadata.
- `app/core/metrics.py`: In-memory thread-safe counters tracking query throughput, latency averages, and language/intent distributions.
- `app/schemas.py`: Pydantic V2 schemas (`QueryRequest`, `QueryResponse`, `AnalyzeResponse`, `HealthResponse`, `VersionResponse`).
- `app/pipeline_stages/base.py`: Abstract `PipelineStage` and `PipelineContext` definitions.
- `app/pipeline_stages/language_stage.py`: Stage 1 (Language & Preprocessing).
- `app/pipeline_stages/transliteration_stage.py`: Stage 2 (Transliteration stub).
- `app/pipeline_stages/intent_stage.py`: Stage 3 (Intent Classification).
- `app/pipeline_stages/entity_stage.py`: Stage 4 (Entity Extraction).
- `app/pipeline_stages/retrieval_stage.py`: Stage 5 (Document Retrieval).
- `app/pipeline_stages/answer_stage.py`: Stage 6 (Answer Generation).
- `app/pipeline.py`: Pipeline orchestrator providing `.execute()` and `.analyze()`.
- `app/api/v1/endpoints.py`: Production `/v1/*` endpoint implementations.
- `app/main.py`: FastAPI application configuring middleware, routes, OpenAPI docs, and backward compatibility.
- `Dockerfile`: Multi-stage, non-root user execution container with built-in healthchecks.
- `tests/stages/test_stages.py`: Unit tests for every individual pipeline stage.
- `tests/api/test_api.py`: FastAPI `TestClient` tests covering health, version, metrics, auth validation, and `/v1/analyze`.
- `tests/api/test_e2e.py`: End-to-end integration tests over 6 distinct multilingual inquiries.

### Server Gateway Integration (`server/`)
- `server/services/nlpClient.js`: Production HTTP service client featuring exponential backoff retries, configurable timeouts, error mapping, and authentication header propagation.
- `server/routes/chat.js`: Express gateway endpoint delegating to `nlpClient.query()`.

### Infrastructure & CI/CD
- `docker-compose.yml`: Healthcheck definitions for all containers (`mongo`, `redis`, `nlp-service`, `server`).
- `.github/workflows/ci.yml`: Automated CI pipeline testing stages, API endpoints, and evaluation scripts on pull requests and pushes.
- `eval/eval_rest_api.py`: Benchmarking script writing metrics to `eval/results/07-rest-api.json`.
- `scripts/demo_rest_api.py`: Interactive CLI demonstration.

---

## API Endpoints & OpenAPI Documentation

Interactive Swagger documentation is automatically available at **`http://localhost:8000/docs`** and ReDoc at **`http://localhost:8000/redoc`**.

### 1. `POST /v1/query`
Executes the full pipeline and returns synthesized response with attribution.
- **Headers**: `X-API-Key: campus_mate_secret_token_123`
- **Request**:
  ```json
  {
    "query": "Exam form bharne ki last date kab hai bhai late fees lagegi kya?"
  }
  ```
- **Response**:
  ```json
  {
    "request_id": "beca3fe0-1139-4b51-bb3c-8d93a0ecd1a4",
    "answer": "Students must verify all enrolled course codes, branch details, and elective subjects before final submission of the exam form.",
    "language": "hi-Latn",
    "intent": "exam_form_deadline",
    "confidence": 0.718,
    "source_doc": "01_exam_notice_en.txt",
    "entities": [],
    "execution_time_ms": 3.535
  }
  ```

### 2. `POST /v1/analyze`
Returns all intermediate pipeline traces (tokens, language confidence, intent probabilities, entity offsets, retrieved chunk scores, stage latencies) without generating final response text.
- **Headers**: `X-API-Key: campus_mate_secret_token_123`
- **Response**:
  ```json
  {
    "request_id": "9b186843-2ba6-4c54-b16b-792395bfd905",
    "raw_query": "What is the fee for BTech Computer Engineering?",
    "normalized_query": "what is the fee for btech computer engineering",
    "tokens": ["what", "is", "the", "fee", "for", "btech", "computer", "engineering"],
    "detected_language": "en",
    "script": "Latin",
    "language_confidence": 0.9,
    "intent": "fee_structure",
    "intent_confidence": 0.692,
    "is_fallback_intent": false,
    "entities": [
      { "label": "COURSE", "text": "BTech", "start": 20, "end": 25 },
      { "label": "BRANCH", "text": "Computer Engineering", "start": 26, "end": 46 }
    ],
    "stage_latencies_ms": {
      "language_detection": 0.030,
      "transliteration": 0.000,
      "intent_classification": 0.746,
      "entity_extraction": 0.068,
      "document_retrieval": 0.394
    },
    "total_latency_ms": 1.258
  }
  ```

### 3. Service Management Endpoints
- `GET /v1/health`: `{"status": "ok", "service": "nlp-service", "version": "1.0.0", "models_loaded": true}`
- `GET /v1/version`: Returns active feature flag states and build version.
- `GET /v1/metrics`: Counter metrics including total queries, uptime, average latency, and language/intent distributions.

---

## How to Run & Verify

### Run All Unit & E2E Tests
```bash
PYTHONPATH=nlp-service python3 -m unittest discover -s nlp-service/tests/stages -p "test_*.py"
PYTHONPATH=nlp-service python3 -m unittest discover -s nlp-service/tests/api -p "test_*.py"
```

### Run REST API Benchmark
```bash
python3 eval/eval_rest_api.py
```

### Run Interactive Demonstration
```bash
python3 scripts/demo_rest_api.py
```

---

## Benchmark Results (`eval/results/07-rest-api.json`)

Benchmarked over 60 requests spanning 6 multi-dialect queries:

| Metric | Measured Value | Notes |
| :--- | :--- | :--- |
| **API Availability & Success Rate** | **100.0%** | Zero failures or dropouts |
| **Average End-to-End Latency** | **3.02 ms** | Full 6-stage pipeline latency |
| **P50 Latency** | **2.89 ms** | Median response time |
| **P95 Latency** | **3.25 ms** | Strict tail-latency bound |
| **Authentication Enforcement** | **Verified** | 401 Unauthorized returned on missing/invalid API key |
| **Request-ID Tracing** | **Verified** | Correlation ID attached via header & JSON logs |
| **Error Handling Middleware** | **Verified** | 500 JSON response with error ID logging |

### Per-Stage Average Latency Breakdown
- **Language Detection & Preprocessing**: `0.040 ms`
- **Transliteration Stage**: `0.000 ms` (clean stub)
- **Intent Classification**: `0.783 ms`
- **Entity Extraction**: `0.091 ms`
- **Document Retrieval (TF-IDF)**: `0.390 ms`
- **Answer Generation**: `0.028 ms`

