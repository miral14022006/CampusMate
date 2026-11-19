# Feature 13: Public Deployment

## 1. Architecture Overview

```mermaid
flowchart TD
    subgraph Clients ["Client"]
        WebUser["Student (React Web App)"]
    end

    subgraph EdgeProxy ["Edge Reverse Proxy & Security"]
        Nginx["Nginx (SSL / HTTPS + Gzip + Rate Limit)"]
    end

    subgraph NodeGateway ["Node.js API Gateway (Express)"]
        Security["Security Middleware: Helmet + CORS + Input Limits"]
        ChatAPI["Chat, History & Admin APIs"]
        RedisCache["Redis (ioredis Cache & Dialogue TTL)"]
    end

    subgraph NLPService ["NLP Microservice (Python FastAPI)"]
        LangID["Language & Transliteration"]
        Intent["Transformer Intent (MuRIL)"]
        RAG["Hybrid Retrieval & RAG Verification"]
    end

    subgraph DataStore ["Managed Persistence"]
        Atlas[("MongoDB Atlas")]
        RedisDB[("Redis / Upstash")]
    end

    WebUser -->|HTTPS| Nginx

    Nginx --> Security
    Security --> ChatAPI
    ChatAPI <--> RedisCache
    ChatAPI -->|REST /v1/query| NLPService
    ChatAPI --> Atlas
    RedisCache <--> RedisDB
```

---

## 2. Production Deployment Options (Free Tiers Guide)

### Option A: Render / Railway (Backend & NLP) + Vercel (Frontend)
1. **Frontend (Vercel / Netlify)**:
   - Deploy directory: `client/`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable: `VITE_API_BASE_URL=https://your-server.onrender.com/api`

2. **Node.js Gateway (Render / Railway)**:
   - Root directory: `server/`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Add environment variables: `MONGODB_URI`, `REDIS_URL`, `NLP_SERVICE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.

3. **FastAPI NLP Service (Render / Railway)**:
   - Root directory: `nlp-service/`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - **Free-Tier "Lite Mode"**:
     On free instances (512MB RAM limit), disable the cross-encoder reranker and
     use the lighter dense model to avoid OOM:
     ```env
     ENABLE_RERANKER=false
     DENSE_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
     ```

---

## 3. Environment Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment | `production` / `development` |
| `PORT` | Node server listening port | `5000` |
| `MONGODB_URI` | MongoDB connection string (Atlas or local) | `mongodb+srv://user:pass@cluster.mongodb.net/college_assistant` |
| `REDIS_URL` | Redis cache & session connection string | `redis://default:pass@redis-host:6379` |
| `NLP_SERVICE_URL` | Internal URL to Python FastAPI service | `http://nlp-service:8000` |
| `NLP_API_KEY` | Shared secret header between gateway & NLP | `super-secret-key-123` |
| `JWT_SECRET` | Legacy admin signing secret | `your-jwt-production-secret` |
| `JWT_ACCESS_SECRET` | Access-token signing secret (≥32 chars) | `your-access-secret` |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret (≥32 chars) | `your-refresh-secret` |
| `CORS_ORIGIN` | Allowed web origins | `https://campus-mate.vercel.app` |

---

## 4. Security & Monitoring

- **Security Stack**:
  - `helmet`: Protects HTTP headers against clickjacking, MIME-sniffing, and XSS.
  - `express-rate-limit`: Global API limiter (150 requests per 15 minutes per IP).
  - Payload Size Limits: Strict 100kb body parser limit.
  - Strict JWT protection on `/api/admin/*` routes.
- **Monitoring & Healthchecks**:
  - `GET /health`: Returns gateway status and MongoDB connection state.
  - Production smoke test suite: `deploy/smoke_test.sh <URL>`.

---

## 5. Deployment URLs

Live deployment URLs are intentionally not recorded here. They are environment-
specific and must be supplied by the deployment owner (see "Needs your input" in
`docs/CLEANUP.md`). The local Docker quickstart exposes the app on
`http://localhost:3000`, the gateway on `http://localhost:5000`, and the NLP
service on `http://localhost:8000`.
