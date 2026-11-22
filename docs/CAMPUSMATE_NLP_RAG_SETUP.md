# CampusMate — Setup & Deployment Guide

This guide covers setting up and running the CampusMate assistant locally and in production.

---

## 1. Prerequisites

- Node.js 18+ and npm
- Python 3.11+ with `venv`
- Tesseract OCR (with `tesseract-ocr-hin` and `tesseract-ocr-guj`)
- Poppler utilities (for PDF rasterization)
- MongoDB & Redis

### macOS Homebrew Setup:
```bash
brew install tesseract tesseract-lang poppler redis
```

---

## 2. Local Environment Setup

### A. Python NLP Service
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r nlp-service/requirements.txt
```

### B. Node.js Server Gateway
```bash
cd server
npm install
```

### C. React Frontend
```bash
cd client
npm install
npm run build
```

---

## 3. Running Locally

You can launch the backend services using the startup script:

```bash
./run.sh
```

Or manually:

```bash
# Terminal 1: NLP Microservice
PYTHONPATH=nlp-service uvicorn app.main:app --port 8000 --reload

# Terminal 2: Node.js Gateway
cd server && npm run dev

# Terminal 3: React Frontend
cd client && npm run dev
```

---

## 4. Docker Deployment

Deploying with Docker Compose:

```bash
docker compose up --build -d
```

Validating health status:
```bash
curl http://localhost:8000/health
curl http://localhost:5000/health
```
