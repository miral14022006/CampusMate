# Feature documentation

These documents describe the shipped CampusMate scope. Every feature folder under `server/features/` and `nlp-service/features/` maps to one of these documents.

| Doc | Scope |
|---|---|
| [00-foundation.md](00-foundation.md) | Dataset, preprocessing, baseline intent and retrieval, evaluation harness |
| [01-hybrid-retrieval.md](01-hybrid-retrieval.md) | TF-IDF baseline, BM25, dense FAISS, hybrid reranking, index CLI |
| [01-multilingual-detection.md](01-multilingual-detection.md) | English/Hindi/Gujarati/Hinglish/Gujlish language identification |
| [02-transliteration.md](02-transliteration.md) | Romanized Hindi/Gujarati transliteration |
| [03-transformer-intent.md](03-transformer-intent.md) | MuRIL intent classification and baseline comparison |
| [04-rag.md](04-rag.md) | Evidence gate, grounded generation, citation verification |
| [05-clarification.md](05-clarification.md) | Confidence policy, clarification prompts, helpdesk fallback |
| [06-conversation-memory.md](06-conversation-memory.md) | Dialogue state, follow-up rewriting, session memory |
| [07-rest-api.md](07-rest-api.md) | FastAPI contract, middleware, metrics, API tests |
| [08-admin-versioning.md](08-admin-versioning.md) | Ingestion, document versioning, newest-notice-wins |
| [09-ocr.md](09-ocr.md) | Scanned-document OCR pipeline |
| [10-feedback-loop.md](10-feedback-loop.md) | Feedback capture, failure logging, retraining export |
| [11-analytics.md](11-analytics.md) | Dashboard aggregations and CSV exports |
| [12-caching-performance.md](12-caching-performance.md) | Redis cache, dialogue TTL, latency telemetry |
| [13-deployment.md](13-deployment.md) | Docker/nginx production topology and environment |
| [14-synthetic-multilingual-dataset.md](14-synthetic-multilingual-dataset.md) | Synthetic multilingual query generation and validation |
| [15-calendar.md](15-calendar.md) | Calendar events, ICS feed, optional Google OAuth |
| [16-auth.md](16-auth.md) | Student/admin/superadmin auth, invites, sessions, audit log |
| [17-activity.md](17-activity.md) | Activity events, retention, dashboard activity tab |

## Verification

- Server: `cd server && npm test`
- NLP: `cd nlp-service && pytest`
- Client build: `cd client && npm run build`
- Quick evaluations: `python3 eval/eval_language_detection.py`, `python3 eval/run_intent.py`, `python3 eval/run_retrieval.py`
- Cleanup record: [../CLEANUP.md](../CLEANUP.md)
