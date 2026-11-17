# Multilingual College Assistant

An end-to-end AI/ML-powered college helpdesk assistant supporting English, Hindi, Gujarati, Hinglish (code-mixed Hindi-English), and Gujlish (code-mixed Gujarati-English). Designed as a production-grade minor project and AI/ML resume asset.

## Architecture

- `client/` : React + Vite + Tailwind CSS chat UI with real-time badges (language, intent, confidence, sources).
- `server/` : Node.js + Express + MongoDB (Mongoose) + Redis API Gateway and conversation state storage.
- `nlp-service/` : Python 3.11 + FastAPI microservice orchestrating NLP preprocessing, language identification, intent classification, entity extraction, TF-IDF retrieval, and multilingual extractive answering.
- `data/` : Raw documents, parsed chunks, stopwords, lexicons, entity patterns, seed datasets, TF-IDF indices, response templates.
- `eval/` : Rigorous evaluation harness computing language accuracy, intent accuracy/macro-F1, retrieval Recall@3, and MRR. Results stored in `eval/results/`.
- `docs/features/` : Feature specifications, reproduction steps, API docs, and measured metrics.

## Quickstart

### Prerequisites
- Python 3.9+ (or 3.11 via Docker)
- Node.js 18+ & npm
- MongoDB & Redis (or use Docker Compose)

### 1. NLP Service Setup
```bash
cd nlp-service
pip install -r requirements.txt
# Train baseline intent model and build document retrieval index:
python -m app.modules.intent_baseline train
python -m app.modules.ingest
# Start FastAPI service:
uvicorn app.main:app --port 8000 --reload
```

### 2. Server Gateway Setup
```bash
cd server
npm install
npm start
```

### 3. Client Setup
```bash
cd client
npm install
npm run dev
```

### 4. Running Baseline Evaluation
```bash
python eval/run_baseline.py
```
Numbers are automatically written to `eval/results/00-baseline.json`.

### 5. Running Quick CLI Query
```bash
python nlp-service/cli.py "Exam form bharne ki last date kya hai?"
```

