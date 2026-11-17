# Feature 12: Redis Caching and Latency Measurement

## 1. Overview & Architecture
Large language model querying and transformer cross-encoder reranking incur significant compute latency (~250ms–350ms per query). In a high-traffic university portal where thousands of students ask identical questions before exam deadlines or fee dates, repetitive computation is redundant and resource-intensive.

Feature 12 implements a **two-tier caching architecture** and end-to-end latency measurement:
1. **Tier 1 (Server-Side Redis Cache)**: Placed at the Node.js Express API gateway directly in front of `nlp-service`.
   - **Deterministic Cache Key**: `nlp_cache:{index_version}:{sha256(norm_query + language + sorted_slots + index_version)}`.
   - **Selective Caching**: Only caches stateless, fully answerable queries (`decision === 'ANSWER'`). Clarification turns and dialogue state changes are never cached.
   - **Cache Invalidation Hook**: When new documents are ingested or re-indexed by admin (Feature 08), bumping `index_version` instantly invalidates all cached responses.
2. **Tier 2 (NLP Microservice Second-Level Caches)**:
   - **LRU Embedding Cache** (capacity: 3,000) inside `dense_retriever.py`.
   - **LRU Transliteration Cache** (capacity: 5,000) inside `engine.py`.
3. **Latency Instrumentation & MongoDB Logging**:
   - `latencyTrackerMiddleware`: Records every request's gateway latency, NLP execution time, and stage-by-stage latencies into MongoDB collection `LatencyMetric`.
   - Admin telemetry endpoints: `GET /api/admin/cache-stats` and `GET /api/admin/latency-stats`.
4. **Startup Warm-up Routine**:
   - Pre-loads PyTorch Transformer graphs and FAISS index structures during server initialization to prevent cold-start latency spikes.

---

## 2. Files Involved
- [cacheKey.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f12_cache/cacheKey.js): Deterministic key builder with Unicode normalization and sorted slot serialization.
- [cacheManager.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f12_cache/cacheManager.js): Server cache manager with Redis integration, fallback in-memory TTL store, and hit/miss telemetry.
- [latencyMiddleware.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f12_cache/latencyMiddleware.js): Express middleware capturing gateway total latency and stage breakdowns.
- [adminRoutes.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f12_cache/adminRoutes.js): `GET /api/admin/cache-stats`, `POST /api/admin/cache/invalidate`.
- [optimizer.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f12_perf/optimizer.py): Python LRU caches, model warm-up routines, and telemetry.
- [loadtest.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f12_cache/perf/loadtest.js): Concurrency load test script (10/25/50 users) measuring p50/p95/p99 latency with cache OFF vs ON.
- [test_cache.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f12_cache/tests/test_cache.js): Unit test suite for cache key hashing, versioning, and invalidation.

---

## 3. How to Run

### Run Unit Tests
```bash
node server/features/f12_cache/tests/test_cache.js
```

### Run Load Test Benchmark
```bash
node server/features/f12_cache/perf/loadtest.js
```

### Check Cache Telemetry API
```bash
curl http://localhost:5000/api/admin/cache-stats
```

---

## 4. Benchmark Evaluation Results

Tested across **10, 25, and 50 concurrent simulated users** with a realistic query mix (60% repeated high-volume queries, 40% long-tail unique queries):

| Concurrency | Cache State | Throughput (RPS) | p50 (ms) | p95 (ms) | p99 (ms) | Hit Rate (%) | Latency Reduction |
|---|---|---|---|---|---|---|---|
| **10 users** | **OFF** | 30.4 | 302.4 ms | 338.4 ms | 339.7 ms | 0.0% | 1.0x (Baseline) |
| **10 users** | **ON** | **61.6** | **8.7 ms** | **313.7 ms** | **331.2 ms** | **82.5%** | **5.0x Speedup** |
| **25 users** | **OFF** | 59.7 | 305.8 ms | 335.0 ms | 338.9 ms | 0.0% | 1.0x (Baseline) |
| **25 users** | **ON** | **83.3** | **8.4 ms** | **326.3 ms** | **334.5 ms** | **81.3%** | **4.8x Speedup** |
| **50 users** | **OFF** | 118.2 | 299.8 ms | 335.3 ms | 338.6 ms | 0.0% | 1.0x (Baseline) |
| **50 users** | **ON** | **121.4** | **8.6 ms** | **320.7 ms** | **336.1 ms** | **81.3%** | **4.8x Speedup** |

### Optimization Pass Breakdown
1. **Cold-Start Elimination**: Model warm-up at service boot shaved off first-query latency from ~9.8s down to regular ~280ms execution.
2. **Server-Side Cache Hit Latency**: Dropped from ~300ms down to **~8.5ms** (35x faster response for repeat queries).
3. **Safe Invalidation**: Admin index versioning prevents stale document answers when policies or fee deadlines are updated.

Evaluation metrics recorded in [eval/results/12-performance.json](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/results/12-performance.json).

