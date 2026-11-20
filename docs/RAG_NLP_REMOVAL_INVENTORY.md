# CampusMate — Complete RAG & NLP Removal Inventory

**Date:** November 20, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Purpose:** Pre-deletion inventory and dependency audit for selective removal of the existing RAG/NLP implementation while preserving all frontend, main backend, authentication, database, and admin services.

---

## 1. Classification Guidelines

- **RAG_ONLY**: Components exclusively implementing Retrieval-Augmented Generation (dense/sparse vector search, RRF fusion, prompt construction, chunking, FAISS index, cross-encoder reranker, Gemini RAG generation).
- **NLP_ONLY**: Components exclusively implementing the legacy NLP microservice, language detection benchmarks, transliteration engines, intent classifiers, synthetic dataset generators, and NLP-specific endpoints.
- **SHARED**: Components containing shared infrastructure or business logic (e.g. backend chat route, admin document upload controller, docker-compose, server health checks, environment files). These must be modified selectively to safely decouple NLP/RAG dependencies while preserving all other functionality.
- **FRONTEND**: The React 18 / Vite frontend application, including all UI components, admin dashboards, student pages, and the chatbot interface. Must be preserved untouched.
- **UNRELATED**: Unrelated backend microservices, models, authentication routes, calendar integration, and system utilities. Must be preserved untouched.
- **UNKNOWN**: Items requiring investigation before any deletion or modification.

---

## 2. Component Inventory Table

| File / Folder / Component | Purpose | Classification | Action |
|---|---|---|---|
| `nlp-service/` | Dedicated FastAPI NLP Microservice (pipeline, stages, intent, transliteration, FAISS, BM25, RAG engine, Gemini client) | **NLP_ONLY** / **RAG_ONLY** | **Remove directory entirely** |
| `eval/` | Benchmark and evaluation scripts for NLP, RAG, intent, OCR, transliteration, gate tuning | **NLP_ONLY** / **RAG_ONLY** | **Remove directory entirely** |
| `notebooks/train_intent_muril.ipynb` | MuRIL intent training Jupyter notebook | **NLP_ONLY** | **Remove file** |
| `data/index/` | Serialized vector indices (`faiss_index.bin`, `bm25.pkl`, `intent_classifier.joblib`, `intent_vectorizer.joblib`, `tfidf_retrieval.joblib`) | **RAG_ONLY** | **Remove index files (preserve directory)** |
| `data/datasets/` | Synthetic NLP datasets, seed queries, and training CSV files for intent & retrieval | **NLP_ONLY** | **Remove files (preserve directory structure)** |
| `data/lexicons/` | Custom transliteration and OCR correction rule files | **NLP_ONLY** | **Remove files** |
| `data/patterns/` | Regex patterns for legacy multilingual parsing | **NLP_ONLY** | **Remove files** |
| `data/processed/` | Processed chunk metadata (`chunks.json`) | **RAG_ONLY** | **Remove chunk data** |
| `data/prompts/` | RAG prompt templates and paraphrase prompts | **RAG_ONLY** | **Remove files** |
| `data/raw/` | Raw text notice test fixtures | **NLP_ONLY** | **Remove files** |
| `data/stopwords/` | Language stopwords files | **NLP_ONLY** | **Remove files** |
| `data/templates/` | Legacy response & clarification template JSONs | **NLP_ONLY** | **Remove files** |
| `data/intents.json` | Intent definitions JSON | **NLP_ONLY** | **Remove file** |
| `data/contacts.json` | Department contacts JSON | **SHARED** | **Preserve** |
| `data/language_eval_benchmark.json` | Benchmark test cases for language evaluation | **NLP_ONLY** | **Remove file** |
| `data/uploads/` | Original student and admin uploaded PDF documents | **SHARED** | **PRESERVE INTACT (Never delete original files)** |
| `scripts/demo_*.py` | Python demo scripts for NLP/RAG pipeline stages | **NLP_ONLY** / **RAG_ONLY** | **Remove demo scripts** |
| `scripts/seedAnalytics.js` | MongoDB seed script for analytics | **UNRELATED** | **Preserve** |
| `scripts/seedSuperadmin.js` | MongoDB seed script for admin user | **UNRELATED** | **Preserve** |
| `scripts/migrateAdminUsers.js` | Database user migration script | **UNRELATED** | **Preserve** |
| `scripts/generate_hero.py` | UI asset script | **UNRELATED** | **Preserve** |
| `server/services/nlpClient.js` | HTTP client communicating exclusively with `nlp-service` | **NLP_ONLY** | **Remove file** |
| `server/routes/chat.js` | Chat gateway route for students and guests | **SHARED** | **Modify (Preserve route & history, return graceful maintenance/unavailable reply until new RAG is connected)** |
| `server/features/chat/chatController.js` | Legacy `/api/legacy/chat` route querying NLP | **NLP_ONLY** | **Remove file & folder** |
| `server/features/f08_admin/documentController.js` | Admin document management, upload, versioning, reindexing | **SHARED** | **Modify (Preserve uploads, MongoDB records, file validation; disconnect HTTP calls to `/v1/documents/ingest` and `/v1/documents/reindex`)** |
| `server/features/f08_admin/tests/documentDelete.test.js` | Unit test for document deletion mocking nlpClient | **SHARED** | **Modify (Remove nlpClient mock)** |
| `server/tests/chat.test.js` | Chat gateway controller unit test | **SHARED** | **Modify (Update test to assert graceful offline/maintenance response)** |
| `server/scripts/reindexAllDocuments.js` | Admin script sending POST to `/v1/documents/reindex` | **RAG_ONLY** | **Remove script** |
| `server/server.js` | Main Express server entry point | **SHARED** | **Modify (Remove `/api/legacy/chat` registration, remove `nlpClient` healthcheck check in `/health`)** |
| `docker-compose.yml` | Local Docker Compose configuration | **SHARED** | **Modify (Remove `nlp-service` container; preserve mongo, redis, server, client)** |
| `docker-compose.prod.yml` | Production Docker Compose configuration | **SHARED** | **Modify (Remove `campusmate_nlp` container; preserve caddy, client, server)** |
| `run.sh` | Local startup orchestrator script | **SHARED** | **Modify (Remove Python FastAPI NLP service startup step)** |
| `package.json` | Root repository script orchestrator | **SHARED** | **Modify (Remove `test:nlp` and `golden` scripts)** |
| `client/` | Entire React frontend, Vite app, chatbot interface, admin console | **FRONTEND** | **PRESERVE 100% UNTOUCHED** |
| `client/src/features/chat/` | React chatbot UI components (`Composer`, `ChatMessage`, `useChat`, `HistoryPanel`) | **FRONTEND** | **PRESERVE 100% UNTOUCHED** |
| `client/src/features/admin/` | Admin dashboard components, documents table, analytics | **FRONTEND** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f16_auth/` | JWT authentication, student auth, admin auth, RBAC | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f00_history/` | Persistent conversation history schemas & models | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f06_sessions/` | Redis/Memory session manager | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f11_analytics/` | Dashboard analytics aggregations & routes | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f12_cache/` | Redis cache manager & latency middleware | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f15_calendar/` | Academic calendar parsing, ICS export, and event approvals | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f17_activity/` | Audit and activity logging | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/features/f18_documents_public/` | Public student document catalog routes | **UNRELATED** | **PRESERVE 100% UNTOUCHED** |
| `server/models/` | Mongoose schemas (User, AdminUser, Document, Message, Conversation, etc.) | **SHARED** | **PRESERVE 100% UNTOUCHED** |

---

## 3. Environment Variables Classification

| Variable | Location | Classification | Action |
|---|---|---|---|
| `NLP_SERVICE_URL` | `.env`, `docker-compose.yml`, `docker-compose.prod.yml` | **NLP_ONLY** | **Remove from compose & configs** |
| `NLP_API_KEY` | `.env`, `docker-compose.yml`, `docker-compose.prod.yml` | **NLP_ONLY** | **Remove from compose & configs** |
| `LLM_PROVIDER` | `docker-compose.yml`, `docker-compose.prod.yml` | **NLP_ONLY** | **Remove from compose & configs** |
| `GEMINI_API_KEY` | `nlp-service/.env`, `docker-compose.yml` | **NLP_ONLY** | **Remove from compose & configs** |
| `GEMINI_MODEL` | `nlp-service/.env`, `docker-compose.prod.yml` | **NLP_ONLY** | **Remove from compose & configs** |
| `ENABLE_RERANKER` | `docker-compose.yml`, `docker-compose.prod.yml` | **RAG_ONLY** | **Remove from compose & configs** |
| `MONGODB_URI` | `server/.env`, compose | **SHARED** | **PRESERVE** |
| `REDIS_URL` | `server/.env`, compose | **SHARED** | **PRESERVE** |
| `JWT_ACCESS_SECRET` | `server/.env`, compose | **SHARED** | **PRESERVE** |
| `JWT_REFRESH_SECRET` | `server/.env`, compose | **SHARED** | **PRESERVE** |
| `ALLOWED_EMAIL_DOMAINS` | `server/.env`, compose | **SHARED** | **PRESERVE** |
| `SUPERADMIN_EMAIL` | `server/.env`, compose | **SHARED** | **PRESERVE** |
| `UPLOAD_DIR` | `server/.env`, compose | **SHARED** | **PRESERVE** |

---

## 4. Execution Plan

1. **Modify Shared Server Routes and Controllers:**
   - Update `server/routes/chat.js` to return a clean, friendly maintenance response (`"CampusMate AI Assistant is undergoing scheduled maintenance. The conversational service will be restored shortly."`) with `mode: "maintenance"` while preserving session saving, message creation, and history tracking.
   - Remove `server/features/chat/chatController.js` and deregister `/api/legacy/chat` from `server/server.js`.
   - Update `server/features/f08_admin/documentController.js` to disconnect HTTP calls to `/v1/documents/ingest`, `/v1/index/status`, `/v1/debug/retrieve`, and `/v1/documents/reindex`, preserving the complete file upload, duplicate checksum detection, and MongoDB document record lifecycle.
   - Remove `server/services/nlpClient.js` and remove its reference from `server/server.js` `/health` route.
   - Update tests in `server/features/f08_admin/tests/documentDelete.test.js` and `server/tests/chat.test.js`.
2. **Remove Dedicated NLP/RAG Directories and Files:**
   - Remove `nlp-service/`.
   - Remove `eval/`.
   - Remove `notebooks/train_intent_muril.ipynb`.
   - Remove `scripts/demo_*.py`.
   - Remove `server/scripts/reindexAllDocuments.js`.
   - Remove legacy index artifacts in `data/index/`, `data/datasets/`, `data/lexicons/`, `data/patterns/`, `data/processed/`, `data/prompts/`, `data/raw/`, `data/stopwords/`, `data/templates/`, `data/intents.json`, `data/language_eval_benchmark.json`.
3. **Update Docker and Script Orchestrators:**
   - Update `docker-compose.yml` to remove `nlp-service`.
   - Update `docker-compose.prod.yml` to remove `campusmate_nlp`.
   - Update `run.sh` to remove FastAPI NLP startup.
   - Update `package.json` to remove obsolete `test:nlp` and `golden` scripts.
4. **Verification & Testing:**
   - Run `npm test` in `server/` to ensure all 9 test suites pass.
   - Run `npm run build` in `client/` to verify frontend builds cleanly.
   - Validate Docker Compose configurations (`docker compose config`).
   - Create comprehensive completion report `docs/RAG_NLP_REMOVAL_REPORT.md`.
