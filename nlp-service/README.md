# CampusMate NLP & RAG Service

Modular, high-performance multilingual NLP and RAG microservice for CampusMate assistant.

## Capabilities

- **Multilingual Support:** English, Hindi (Devanagari), Gujarati script, Romanized Hinglish, and Romanized Gujlish.
- **Language & Script Detection:** Unicode range script detection + lexical heuristics.
- **Transliteration:** Dual-form query expansion bridging Romanized queries with Indic documents.
- **22 College Intents:** TF-IDF + Logistic Regression with out-of-scope confidence gating.
- **Entity Extraction:** Courses, branches, semesters, dates, and exam types.
- **Document Ingestion:** PDF (digital + scanned OCR with Tesseract), DOCX, and TXT parser.
- **Hybrid Retrieval:** BM25 sparse matching + FAISS dense cosine search (`all-MiniLM-L6-v2`) with Reciprocal Rank Fusion ($k=60$) and Cross-Encoder reranking (`ms-marco-MiniLM-L-6-v2`).
- **Grounded Generation:** Gemini Flash with citation validation, page tracking, and extractive sentence fallback.
- **Session Memory:** Isolated conversational slot carry-over for natural follow-ups.

## API Endpoints

- `GET /health`: Microservice health check
- `GET /ready`: Model and index readiness status
- `POST /v1/chat`: Complete question-to-answer RAG endpoint
- `POST /v1/retrieval/search`: Direct semantic and hybrid document retrieval
- `POST /v1/documents/reindex`: Rebuild all indexes from uploads
- `GET /v1/documents`: List indexed documents and chunk statistics

## CLI Usage

```bash
python -m app.cli
```
