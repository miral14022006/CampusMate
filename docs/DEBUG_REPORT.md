# STAGE 1: DEBUG REPORT — ROOT CAUSE ANALYSIS & EVIDENCE

**Investigation Date:** 2026-11-20  
**Target Queries Tested:**
1. `"When is the exam registration deadline?"`
2. `"exam date"`
3. `"exam time table"`
4. `"How do I pay my semester fee online?"`
5. `"Exam schedule?"`
6. `"Fee details?"`

---

## 1. Exact Canned String Occurrences & Triggers

| String | Producing File(s) & Line(s) | Triggering Condition |
|---|---|---|
| `"operating in offline mode"` / `"Thank you for reaching out"` | `server/routes/chat.js:96` | Fired in `catch (nlpErr)` when `nlpClient.query()` throws `NLP_SERVICE_UNAVAILABLE`, `NLP_SERVICE_TIMEOUT`, or HTTP error. The server swallows the real exception and returns this mock canned offline string as `answer`. |
| `"I'm not quite sure how to answer that accurately..."` | `data/templates/clarification_templates.json:119`, `nlp-service/features/f05_clarification/policy.py:248` | Triggered by `DecisionPolicy._build_fallback()` whenever `eval_result["decision"] == "FALLBACK"`. In `AnswerStage.run()`, if `decision in ["CLARIFY", "FALLBACK"]`, `context.answer` is overwritten with this text. |
| `"Verified contact details have not been configured for this deployment yet."` | `nlp-service/features/f05_clarification/policy.py:261` | Triggered inside `DecisionPolicy._build_fallback()` when `CAMPUS_CONTACTS_VERIFIED` environment variable is not `"true"`. Rather than giving a neutral message, it appends this internal debug notice into the user-facing text. |
| `"This answer may not be grounded in a document. Please verify with the office."` | `client/src/features/chat/ChatMessage.jsx:362` | Display condition: `{message.decision === 'FALLBACK' \|\| message.grounded === false}`. It erroneously flags *all* fallback and clarification messages with a "may not be grounded" warning, even when no generation or claims were attempted. |
| Fallback shown twice (with raw `**`) | `nlp-service/features/f05_clarification/policy.py:251` & `server/routes/chat.js:239` & `client/src/features/chat/useChat.js:79` | `_build_fallback` builds markdown with `🏛️ **Helpdesk**`. In `AnswerStage`, `context.answer = context.clarification_question`. In some previous versions or views, both `clarification_question` and `answer` were rendered or echoed. |

---

## 2. Connectivity & Client Settings

1. **Docker Compose & Container Status**:
   - Production container `campusmate_nlp` is running and healthy on `http://nlp-service:8000`.
   - `server/services/nlpClient.js` uses `NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000'`.
   - In production Docker Compose (`docker-compose.prod.yml`), `NLP_SERVICE_URL=http://nlp-service:8000` and `NLP_API_KEY=campus_mate_secret_token_123`.
   - Verified connectivity: Running `GET /v1/health` from inside `campusmate_server` to `http://nlp-service:8000` returned HTTP 200 `{ status: "ok", models_loaded: true }`.
2. **Timeout and Error Mapping**:
   - `TIMEOUT_MS` was originally `4000`ms. Dense embedding + cross-encoder reranking on CPU takes 1000–3500ms on first inference. Under slight server load, this exceeded 4000ms, triggering `NLP_SERVICE_TIMEOUT`.
   - In `server/routes/chat.js:93-107`, any timeout or failure was mapped directly to the canned "operating in offline mode" string instead of a structured error `{ mode: "error" }`.

---

## 3. Data Path & Ingestion Issues

1. **MongoDB Document Status**:
   - In MongoDB, 3 documents were uploaded:
     1. `FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf`
     2. `ACADEMIC_CALENDAR_2026-27_1795164746429.pdf`
     3. `List_of_General_Holidays-2024_1795166011274.pdf`
   - All 3 documents have `chunk_count: 0`, `processing_status: 'completed'`, and `index_version: 'v1'`.
   - Root Cause: In `docker-compose.prod.yml`, the host upload volume `/opt/campusmate/data/uploads` was mounted into `server` at `/app/data/uploads`, but was NOT mounted into `nlp-service`. When `documentController.js` called `/v1/documents/ingest` with `file_path: '/app/data/uploads/...'`, the parser in `nlp-service` could not access the file and extracted 0 chunks. Instead of failing the document with a clear message, it returned `chunks_created: 0`, and the server marked it as `completed`.
2. **NLP Service Index Files**:
   - The NLP service loaded index files from `/app/data/index` containing only 24 synthetic seed chunks (created Nov 19 from `01_exam_notice_en.txt`, `02_fee_notice_en.txt`, etc.).
   - The volume mounted at `/data/index` on the host was completely empty (`[]`).
   - The hot-reload mechanism was non-existent across worker processes: newly ingested documents did not trigger in-memory reloads of FAISS or BM25 index singletons.

---

## 4. Query Pipeline Tracing (Root Cause of Decision Policy Failure)

We traced all six target queries directly through `ModularPipeline.execute()` inside the production container:

| Query | Language | Intent | Intent Conf | Retrieved Top Docs | Top Rerank Score | Policy Decision | Generation Mode |
|---|---|---|---|---|---|---|---|
| **When is the exam registration deadline?** | `en` | `out_of_scope` | 0.0 | `01_exam_notice_en.txt` (score 0.0328) | **+6.4140** | **FALLBACK** | `idk` |
| **exam date** | `en` | `out_of_scope` | 0.0 | `03_academic_calendar_en.txt` (score 0.0301) | **+5.9678** | **FALLBACK** | `idk` |
| **exam time table** | `en` | `out_of_scope` | 0.0 | `03_academic_calendar_en.txt` (score 0.0301) | -3.0138 | **FALLBACK** | `idk` |
| **How do I pay my semester fee online?** | `en` | `out_of_scope` | 0.0 | `02_fee_notice_en.txt` (score 0.0328) | **+3.0981** | **FALLBACK** | `idk` |
| **Exam schedule?** | `en` | `out_of_scope` | 0.0 | `03_academic_calendar_en.txt` (score 0.0299) | **+4.9587** | **FALLBACK** | `idk` |
| **Fee details?** | `en` | `out_of_scope` | 0.0 | `02_fee_notice_en.txt` (score 0.0318) | -2.5981 | **FALLBACK** | `idk` |

### Key Findings from Trace:
1. **The Intent Model was not loaded**:
   `INTENT_MODEL_PATH` evaluates to `/app/data/index/intent_classifier.joblib`. Because that file was only in `data/index/`, `intent_classifier.model` was `None`, causing `baseline_clf.predict()` to return `intent: "out_of_scope"` with confidence `0.0`.
2. **DecisionPolicy Premature Rejection**:
   In `nlp-service/features/f05_clarification/policy.py:116`:
   ```python
   if top1_intent == "out_of_scope" or top1_conf < self.t_low:
       return self._build_fallback(...)
   ```
   This rule evaluated intent confidence *before* checking retrieval evidence. Even though retrieval found the exact relevant chunks with cross-encoder scores as high as **+6.41** (extremely high relevance!), the query was immediately aborted to `FALLBACK` with zero citations.
3. **Retrieval is not treated as primary**:
   In campus QA, student queries often lack clear canonical intent or use colloquial phrases. High retrieval evidence must override weak intent classification.
4. **Missing Slot Handling was bypassed**:
   For underspecified queries like `"exam date"`, because intent was classified as `out_of_scope`, the slot clarification check for `SEMESTER` never ran. Short queries missing slots should trigger `CLARIFY` with semester quick replies, not `FALLBACK`.

---

## 5. Environment & Model Verification

1. **LLM Configuration**:
   - `LLM_PROVIDER=gemini`
   - `GEMINI_MODEL=gemini-1.5-flash` in `docker-compose.prod.yml`. Note: `models/gemini-1.5-flash` returns 404 from the Gemini API because it was deprecated by Google in favor of `gemini-2.5-flash` or `gemini-3.5-flash`.
   - Verified that `gemini-3.5-flash` and `gemini-3.5-flash-lite` return 200 OK with the existing `GEMINI_API_KEY`.
2. **Reranker and Embeddings**:
   - Dense model: `sentence-transformers/all-MiniLM-L6-v2` loaded successfully on CPU.
   - Cross-encoder reranker: `cross-encoder/ms-marco-MiniLM-L-6-v2` loaded successfully on CPU.
3. **Redis & Cache**:
   - Redis container was not configured in `docker-compose.prod.yml`; the server defaulted to an in-memory cache map (`this.memCache`).
   - `isCacheable()` was already checking `decision !== 'ANSWER'`, but `server/routes/chat.js` was caching before checking whether the result had valid grounded citations.

---

## 6. Dashboard & Synthetic Data Audit

1. **Synthetic / Demo Data**:
   - MongoDB collection `queryanalyticslogs` contains **2,306 seeded records** (`isSeeded: true`) out of 2,325 total records.
   - `persistentconversations` contains **295 demo conversations** (`isDemo: true`) out of 305 total.
   - `DashboardFilters.jsx` contains a "Demo data" toggle switch that shows/hides synthetic mock records.
   - `server/scripts/seedAnalytics.js` and `features/f11_analytics/syntheticDataSeeder.js` inject dummy data into production collections.

---

## Summary of Root Causes to Fix in Stage 2–4:
1. **Mount shared upload directory** in `docker-compose.prod.yml` and `docker-compose.yml` so `nlp-service` can parse uploaded files.
2. **Update Ingestion pipeline**: Mark documents with 0 extracted chunks as `failed` with message `"No text found, enable OCR"`; bump `index_version` and hot-reload FAISS, BM25, and metadata.
3. **Make Retrieval Primary in DecisionPolicy**: If normalized evidence score exceeds the threshold, return `ANSWER` regardless of intent confidence. Provide `CLARIFY` with semester quick replies for underspecified queries.
4. **Remove canned offline mode and double-fallbacks**: Return honest `{ mode: "error" }` with Retry button; update model to `gemini-3.5-flash` with extractive sentence fallback if LLM is unavailable.
5. **Purge Demo Data**: Delete seeded records and scripts, remove Demo Data checkbox, and verify all dashboard widgets compute directly from real collections.
