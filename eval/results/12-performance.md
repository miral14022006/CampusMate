# Feature 12: Redis Caching and Latency Benchmark Report

## 1. Load Test Summary (Autocannon / Concurrency Sweep)

| Concurrency | Cache State | Throughput (RPS) | p50 (ms) | p95 (ms) | p99 (ms) | Hit Rate (%) | Speedup |
|---|---|---|---|---|---|---|---|
| 10 users | **OFF** | 30.4 | 302.4 | 338.4 | 339.7 | 0.0% | 1.0x |
| 10 users | **ON** | **61.6** | **8.7** | **313.7** | **331.2** | **82.5%** | **5x** |
| 25 users | **OFF** | 59.7 | 305.8 | 335 | 338.9 | 0.0% | 1.0x |
| 25 users | **ON** | **83.3** | **8.4** | **326.3** | **334.5** | **81.3%** | **4.8x** |
| 50 users | **OFF** | 118.2 | 299.8 | 335.3 | 338.6 | 0.0% | 1.0x |
| 50 users | **ON** | **121.4** | **8.6** | **320.7** | **336.1** | **81.3%** | **4.8x** |

## 2. Optimization Pass Changes
1. **Server-Side Deterministic Caching**: Keyed on `hash(normalized_query + lang + slots + index_version)`. Bypasses full Python pipeline execution on repeated queries.
2. **Second-Level In-Memory Caches**: LRU embedding cache (capacity 3,000) and LRU transliteration cache (capacity 5,000) inside `nlp-service`.
3. **Cold-Start Warm-up**: Pre-loads PyTorch Transformer graphs and FAISS index flat structures at boot.
4. **Cache Invalidation Hook**: Whenever document indexes are rebuilt by admin, `index_version` is incremented, automatically invalidating stale cache keys.
