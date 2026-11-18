const express = require('express');
const { serverCacheManager } = require('./cacheManager');
const LatencyMetric = require('../../models/LatencyMetric');
const { requireAdminAuth } = require('../f08_admin/auth');

const router = express.Router();

/**
 * GET /api/admin/cache-stats
 * Exposes server-side cache hits, misses, hit rate, saved latency, and index version.
 */
router.get('/cache-stats', requireAdminAuth, (req, res) => {
  const stats = serverCacheManager.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: stats
  });
});

/**
 * POST /api/admin/cache/invalidate
 * Invalidates cache by bumping the index version (used during admin re-indexing).
 */
router.post('/cache/invalidate', requireAdminAuth, async (req, res) => {
  const result = await serverCacheManager.invalidateAll();
  res.json({
    message: 'NLP cache invalidated successfully',
    ...result
  });
});

/**
 * GET /api/admin/latency-stats
 * Returns recent aggregate latency metrics from MongoDB.
 */
router.get('/latency-stats', requireAdminAuth, async (req, res) => {
  try {
    if (!LatencyMetric.db || LatencyMetric.db.readyState !== 1) {
      return res.json({
        status: 'ok',
        storage: 'transient_memory',
        message: 'MongoDB not connected, returning in-memory stats',
        cache: serverCacheManager.getStats()
      });
    }

    const recent = await LatencyMetric.find().sort({ timestamp: -1 }).limit(100);
    const avgTotal = recent.reduce((acc, r) => acc + r.totalGatewayLatencyMs, 0) / (recent.length || 1);

    res.json({
      status: 'ok',
      count: recent.length,
      avg_gateway_latency_ms: Math.round(avgTotal * 10) / 10,
      recent_samples: recent.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

