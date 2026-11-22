# CampusMate — Complete NLP and RAG Re-Implementation Technical Audit

**Date:** November 20, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Target Goal:** End-to-end multilingual NLP and RAG pipeline for CampusMate (English, Hindi, Gujarati, Hinglish, Gujlish).

---

## 1. Executive Summary & Existing Repository Status

The previous legacy RAG and NLP implementation was selectively removed to clear out broken abstractions, deprecated model endpoints, and corrupted branch injection logic.

The repository foundation is solid and verified:
- **Client (Frontend):** React 18, Vite, Tailwind CSS with full student chatbot interface (`Composer`, `ChatMessage`, `HistoryPanel`, `useChat`) and admin dashboard. Builds cleanly in 3.56s.
- **Server (Backend API):** Express gateway with student & admin JWT authentication, RBAC, MongoDB Atlas persistence (`college_assistant`), session managers, calendar integrations, and cache handlers. All 55 Jest tests pass.
- **Environment & Models:** Local Python 3.11 virtual environment (`.venv`) contains PyTorch CPU, FAISS, Sentence-Transformers (`all-MiniLM-L6-v2`), transformers, scikit-learn, rapidfuzz, pdfplumber, pypdf, and Tesseract bindings. Production server (Lightsail `3.7.200.54`) running Docker with Caddy SSL termination.
- **Documents:** Real college PDF documents (End Sem Exam Timetable, Academic Calendar 2026-27, General Holidays 2024 with scanned pages) are stored in `data/uploads/`.

---

## 2. Feature-by-Feature Classification Matrix

| Feature | Category | Classification | Current Status & Action Required |
|---|---|---|---|
| **1. Multilingual Input & Preprocessing** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement Unicode NFKC normalization, language-aware tokenization, English/Hindi/Gujarati stopword removal, and slang/spelling normalizers. |
| **2. Language & Script Detection** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement Unicode range script detection (Devanagari `U+0900-U+097F`, Gujarati `U+0A80-U+0AFF`, Latin) + Hinglish/Gujlish vocabulary matcher. |
| **3. Intent Classification (15–25 Intents)** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement 22 college intents + TF-IDF Vectorizer + Logistic Regression / Linear SVM baseline with confidence threshold. |
| **4. Entity Extraction** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement custom regex / dictionary NER for course, branch, semester, dates, exam types. |
| **5. Document Ingestion & Extraction** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement PDF (PyMuPDF / pdfplumber), DOCX, TXT parsers + Tesseract OCR detection for scanned PDFs (eng, hin, guj). |
| **6. Document Chunking** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement sentence-aware chunker preserving page numbers, doc ID, filename, version, and tabular structure. |
| **7. TF-IDF Retrieval Baseline** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement TF-IDF cosine similarity vector retrieval baseline. |
| **8. Extractive Answer Generation & Fallback** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Implement sentence-level extractive answer generation with source doc & page citations in user's query language. |
| **9. Chat Interface & CLI Integration** | Part 1 (Mandatory) | **PARTIALLY IMPLEMENTED** | Frontend UI exists and sends `POST /api/chat`. Need to implement `cli.py` and bridge backend to new FastAPI microservice. |
| **10. Evaluation Dataset (200+ queries)** | Part 1 (Mandatory) | **NOT IMPLEMENTED** | Create 200+ multilingual test query benchmark across en, hi, gu, hinglish, gujlish with evaluation harness. |
| **11. Hybrid Retrieval (BM25 + Dense + RRF)** | Tier A (Core) | **NOT IMPLEMENTED** | Implement BM25 (rank_bm25) + FAISS dense index (`sentence-transformers/all-MiniLM-L6-v2`) + Reciprocal Rank Fusion ($k=60$) + Cross-Encoder reranking. |
| **12. Transliteration (Hinglish/Gujlish)** | Tier A (Core) | **NOT IMPLEMENTED** | Implement transliteration engine mapping Romanized queries to Devanagari/Gujarati dual-form representations. |
| **13. Transformer Intent Classification** | Tier A (Core) | **NOT IMPLEMENTED** | Implement transformer intent classifier and benchmark against TF-IDF baseline. |
| **14. Grounded RAG with LLM Citations** | Tier A (Core) | **NOT IMPLEMENTED** | Implement Gemini RAG generator (`gemini-3-flash-preview`) with citation validation, hallucination checking, and extractive fallback. |
| **15. Confidence Fallback & Clarification** | Tier A (Core) | **NOT IMPLEMENTED** | Implement threshold gating for language, intent, and retrieval relevance with clarification questions. |
| **16. Conversation Memory & Slot Carry-Over** | Tier A (Core) | **NOT IMPLEMENTED** | Implement session-isolated dialogue state tracker tracking branch, semester, course, and topic slots. |
| **17. FastAPI Microservice & Endpoints** | Tier A (Core) | **NOT IMPLEMENTED** | Build FastAPI server exposing `/health`, `/ready`, `/v1/chat`, `/v1/retrieval/search`, `/v1/documents/*`, `/v1/nlp/*`. |
| **18. Admin Document Management & Versioning** | Tier B (Product) | **PARTIALLY IMPLEMENTED** | Server controller and UI exist; need to connect ingestion, version tracking, and reindexing endpoints. |
| **19. OCR for Scanned Documents** | Tier B (Product) | **NOT IMPLEMENTED** | Integrate Tesseract OCR (eng, hin, guj) for non-extractable PDF pages. |
| **20. Feedback Loop** | Tier B (Product) | **ALREADY IMPLEMENTED AND WORKING** | Server `/api/feedback` and DB feedback storage working; connect to NLP query logging. |
| **21. Analytics Dashboard** | Tier B (Product) | **ALREADY IMPLEMENTED AND WORKING** | Server dashboard aggregation and UI working; feed real-time query metrics. |
| **22. Redis Caching & Performance** | Tier B (Product) | **ALREADY IMPLEMENTED AND WORKING** | Server cache manager working; integrate document-version aware invalidation. |
| **23. Docker Integration & Deployment** | Tier B (Product) | **PARTIALLY IMPLEMENTED** | Compose files updated; re-add lightweight, optimized `nlp-service` container. |
| **24. Synthetic Multilingual Training Data** | Tier B (Product) | **NOT IMPLEMENTED** | Generate controlled variations for college intents across 5 language variations. |

---

## 3. Implementation Plan & Milestones

1. **Phase 1: Ingestion & Text Processing Engine**
   - Document Extractors (PDF, DOCX, TXT, OCR).
   - Sentence-aware Chunking with metadata.
   - Preprocessing, Unicode normalization, language-specific stopwords & slang mappings.
2. **Phase 2: Multilingual NLP Pipeline**
   - Script & Language Detector (Devanagari, Gujarati, Latin Hinglish/Gujlish, English).
   - Transliteration Engine (Dual-form query expansion).
   - Intent Classifier (22 college intents with TF-IDF Logistic Regression & calibrated thresholds).
   - Entity Extractor (Branch, semester, course code, dates).
3. **Phase 3: Retrieval Engine**
   - TF-IDF Sparse Retriever.
   - BM25 Sparse Retriever.
   - FAISS Dense Vector Index (`all-MiniLM-L6-v2`, 384d, cosine normalized).
   - Reciprocal Rank Fusion ($k=60$) & Cross-Encoder Reranker.
4. **Phase 4: RAG & Generation Engine**
   - Extractive grounded fallback generator.
   - LLM RAG Generator (`gemini-3-flash-preview` via secure key).
   - Grounding and citation validation.
   - Conversation context / slot carry-over.
5. **Phase 5: FastAPI Application & CLI**
   - Modular FastAPI routes (`/health`, `/ready`, `/v1/chat`, `/v1/documents/*`, `/v1/nlp/*`).
   - Interactive CLI (`python -m app.cli`).
6. **Phase 6: Gateway & Admin Integration**
   - Connect Express `/api/chat` to FastAPI `/v1/chat`.
   - Connect Admin `/api/admin/documents/upload` and reindex to FastAPI ingestion.
7. **Phase 7: Evaluation & Verification**
   - 200+ multilingual query evaluation dataset.
   - End-to-end student chat verification against actual uploaded college notices.
   - Deployment update and report generation.
