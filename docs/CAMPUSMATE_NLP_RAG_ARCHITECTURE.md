# CampusMate — Modular Multilingual NLP & RAG Architecture

**Version:** 2.0.0  
**Status:** Active & Implemented  
**Languages Supported:** English, Hindi (Devanagari), Gujarati script, Romanized Hinglish, Romanized Gujlish.

---

## 1. System Architecture Overview

```
                      +-----------------------------+
                      |       Student Client        |
                      |   (Web / Mobile Frontend)   |
                      +--------------+--------------+
                                     |  HTTPS
                                     v
                      +-----------------------------+
                      |     Caddy Reverse Proxy     |
                      |   (:80 / :443 SSL Edge)     |
                      +--------------+--------------+
                                     |  HTTP
                                     v
                      +-----------------------------+
                      |     Node.js Server Gateway  |
                      |  (Express, Auth, DB, Admin) |
                      +--------------+--------------+
                                     |  HTTP (:8000)
                                     v
                 +---------------------------------------+
                 |    FastAPI NLP & RAG Microservice     |
                 +-------------------+-------------------+
                                     |
    +--------------------------------+--------------------------------+
    |                                |                                |
    v                                v                                v
+------------------+     +-----------------------+      +-------------------+
| Preprocessing &  |     |   Script & Language   |      | Transliteration & |
| NFKC Normalizer  |     |   Detection Engine    |      | Dual-Form Builder |
+------------------+     +-----------------------+      +-------------------+
    |                                |                                |
    +--------------------------------+--------------------------------+
                                     |
                                     v
    +--------------------------------+--------------------------------+
    | Intent Classification (22)     | Entity Extraction (Course/Sem) |
    +--------------------------------+--------------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |       Conversation Memory & Slots     |
                 +-------------------+-------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |         Hybrid Retrieval Engine       |
                 |  - BM25 Okapi Sparse Keyword Matching |
                 |  - TF-IDF Cosine Similarity Baseline  |
                 |  - Dense FAISS (all-MiniLM-L6-v2)     |
                 |  - Reciprocal Rank Fusion (k=60)      |
                 |  - Cross-Encoder Reranker             |
                 +-------------------+-------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |       RAG Grounding & Generation      |
                 |  - Gemini Flash Generator             |
                 |  - Sentence-level Extractive Fallback |
                 |  - Bracketed Source & Page Citations  |
                 |  - Multilingual "I don't know" Gate   |
                 +-------------------+-------------------+
```

---

## 2. Document Ingestion Pipeline

```
Admin Upload (PDF, DOCX, TXT)
      |
      v
Checksum Deduplication (SHA-256)
      |
      v
Document Text Extraction (pypdf, docx, txt)
      |
      v
Scanned PDF Fallback (Tesseract OCR: eng + hin + guj)
      |
      v
Intelligent Chunking (500 chars, sentence & table preservation)
      |
      v
Triple-Indexing:
      |--> TF-IDF Sparse Matrix (joblib)
      |--> BM25 Inverted Index (pickle)
      |--> FAISS Flat Inner Product Dense Index (bin)
```
