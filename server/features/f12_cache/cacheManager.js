const { generateCacheKey } = require('./cacheKey');

const DEFAULT_CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10); // 1 hour

class ServerCacheManager {
  constructor(redisClient = null) {
    this.redisClient = redisClient;
    this.memCache = new Map(); // in-memory fallback
    this.indexVersion = process.env.INDEX_VERSION || 'v1';

    // Metrics counters
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalSavedLatencyMs: 0,
      cachedQueriesCount: 0
    };
  }

  setRedisClient(client) {
    this.redisClient = client;
  }

  setIndexVersion(newVersion) {
    this.indexVersion = newVersion;
    this.stats.invalidations += 1;
    // Clearing in-memory entries for older version
    this.memCache.clear();
  }

  getIndexVersion() {
    return this.indexVersion;
  }

  /**
   * Only cache stateless/answerable query results:
   * Do NOT cache CLARIFY, FALLBACK, or interactive quick replies.
   */
  isCacheable(nlpResult) {
    if (!nlpResult) return false;
    if (nlpResult.decision && nlpResult.decision !== 'ANSWER') return false;
    if (nlpResult.is_follow_up) return false; // follow-ups are state-dependent
    if (nlpResult.clarification_question) return false;
    return true;
  }

  async get(query, language = 'en', slots = null) {
    const key = generateCacheKey(query, language, slots, this.indexVersion);

    // 1. Try Redis
    if (this.redisClient && this.redisClient.isOpen) {
      try {
        const val = await this.redisClient.get(key);
        if (val) {
          const parsed = JSON.parse(val);
          this.stats.hits += 1;
          this.stats.totalSavedLatencyMs += (parsed.execution_time_ms || 250);
          return { data: parsed, cached: true, key };
        }
      } catch (err) {
        console.warn(`[CacheManager] Redis get failed: ${err.message}`);
      }
    }

    // 2. Try In-Memory Fallback
    const memEntry = this.memCache.get(key);
    if (memEntry) {
      if (Date.now() > memEntry.expiresAt) {
        this.memCache.delete(key);
      } else {
        this.stats.hits += 1;
        this.stats.totalSavedLatencyMs += (memEntry.data.execution_time_ms || 250);
        return { data: memEntry.data, cached: true, key };
      }
    }

    this.stats.misses += 1;
    return { data: null, cached: false, key };
  }

  async set(query, language = 'en', slots = null, nlpResult, ttl = DEFAULT_CACHE_TTL) {
    if (!this.isCacheable(nlpResult)) return false;

    const key = generateCacheKey(query, language, slots, this.indexVersion);

    // Save in memory
    this.memCache.set(key, {
      data: nlpResult,
      expiresAt: Date.now() + ttl * 1000
    });
    this.stats.cachedQueriesCount = this.memCache.size;

    // Save in Redis
    if (this.redisClient && this.redisClient.isOpen) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(nlpResult));
      } catch (err) {
        console.warn(`[CacheManager] Redis set failed: ${err.message}`);
      }
    }

    return true;
  }

  /**
   * Generic raw cache helpers (used by Feature 11 dashboards, 60s TTL).
   */
  async getRaw(key) {
    if (this.redisClient && this.redisClient.isOpen) {
      try {
        const val = await this.redisClient.get(key);
        if (val) return JSON.parse(val);
      } catch (err) {
        console.warn(`[CacheManager] Redis raw get failed: ${err.message}`);
      }
    }
    const entry = this.memCache.get(key);
    if (entry) {
      if (Date.now() > entry.expiresAt) {
        this.memCache.delete(key);
      } else {
        return entry.data;
      }
    }
    return null;
  }

  async setRaw(key, value, ttl = 60) {
    this.memCache.set(key, { data: value, expiresAt: Date.now() + ttl * 1000 });
    if (this.redisClient && this.redisClient.isOpen) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      } catch (err) {
        console.warn(`[CacheManager] Redis raw set failed: ${err.message}`);
      }
    }
    return true;
  }

  /**
   * Invalidate cache when an admin re-indexes documents (Part 8 Hook)
   */
  async invalidateAll() {
    this.setIndexVersion(`v_${Date.now()}`);

    if (this.redisClient && this.redisClient.isOpen) {
      try {
        // scan and delete keys matching pattern
        const keys = await this.redisClient.keys('nlp_cache:*');
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (err) {
        console.warn(`[CacheManager] Redis invalidate failed: ${err.message}`);
      }
    }
    return { status: 'invalidated', new_version: this.indexVersion };
  }

  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0.0;
    const avgSavedLatency = this.stats.hits > 0 ? this.stats.totalSavedLatencyMs / this.stats.hits : 0.0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      total_requests: totalRequests,
      hit_rate_pct: Math.round(hitRate * 100) / 100,
      total_saved_latency_ms: Math.round(this.stats.totalSavedLatencyMs),
      avg_saved_latency_ms: Math.round(avgSavedLatency * 10) / 10,
      invalidations: this.stats.invalidations,
      index_version: this.indexVersion,
      mem_cached_entries: this.memCache.size
    };
  }
}

const serverCacheManager = new ServerCacheManager();

module.exports = {
  ServerCacheManager,
  serverCacheManager,
  DEFAULT_CACHE_TTL
};

