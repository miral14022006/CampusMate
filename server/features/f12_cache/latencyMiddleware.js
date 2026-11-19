/**
 * Express Middleware recording request latency and NLP stage breakdowns into MongoDB
 */
const LatencyMetric = require('../../models/LatencyMetric');

function latencyTrackerMiddleware(req, res, next) {
  const startTime = process.hrtime();

  res.on('finish', async () => {
    // Only track chat queries
    if (!req.path.includes('/api/chat') || req.method !== 'POST') return;

    const diff = process.hrtime(startTime);
    const totalLatencyMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

    const metricsData = res.locals.latencyData || {};

    try {
      if (LatencyMetric.db && LatencyMetric.db.readyState === 1) {
        await LatencyMetric.create({
          requestId: metricsData.requestId || `req_${Date.now()}`,
          sessionId: req.body?.sessionId || 'default',
          query: req.body?.query || '',
          language: metricsData.language || 'en',
          intent: metricsData.intent || 'unknown',
          cached: Boolean(metricsData.cached),
          totalGatewayLatencyMs: totalLatencyMs,
          nlpExecutionTimeMs: metricsData.nlpExecutionTimeMs || 0,
          stageLatencies: metricsData.stageLatencies || {}
        });
      }
    } catch {
      // Gracefully silent if DB is down
    }
  });

  next();
}

module.exports = { latencyTrackerMiddleware };

