const express = require('express');
const router = express.Router();
const QueryAnalyticsLog = require('../../models/QueryAnalyticsLog');
const { requireAdminAuth } = require('../f08_admin');
const { recordAuditLog } = require('../f16_auth/auditService');
const {
  buildMatchFilter,
  getSummaryPipeline,
  getQueriesOverTimePipeline,
  getTopIntentsPipeline,
  getLanguageDistributionPipeline,
  getTopUnansweredQueriesPipeline,
  getTopQueriesPipeline,
  getDocUsagePipeline,
  calculateP95
} = require('./analyticsAggregations');

// Memory store fallback when MongoDB is running transiently
const memoryAnalyticsStore = [];

/**
 * Helper to record query log in Mongo or in-memory
 */
async function logQueryAnalytics(entry) {
  try {
    if (QueryAnalyticsLog.db && QueryAnalyticsLog.db.readyState === 1) {
      return await QueryAnalyticsLog.create(entry);
    }
  } catch (err) {
    console.warn(`[Analytics Logger] Fallback to memory store: ${err.message}`);
  }
  const item = {
    _id: `mem_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...entry,
    createdAt: entry.createdAt || new Date()
  };
  memoryAnalyticsStore.push(item);
  return item;
}

/**
 * GET /api/admin/analytics/overview
 * Comprehensive dashboard metrics aggregation
 */
router.get('/overview', requireAdminAuth, async (req, res) => {
  const startTime = Date.now();
  const { startDate, endDate, includeSeeded = 'true' } = req.query;

  try {
    const filterMatch = buildMatchFilter({ startDate, endDate, includeSeeded });

    if (QueryAnalyticsLog.db && QueryAnalyticsLog.db.readyState === 1) {
      // Execute aggregation pipelines concurrently
      const [
        summaryResult,
        queriesOverTime,
        topIntents,
        languageDistribution,
        topUnanswered,
        topQueries,
        docUsage
      ] = await Promise.all([
        QueryAnalyticsLog.aggregate(getSummaryPipeline(filterMatch)),
        QueryAnalyticsLog.aggregate(getQueriesOverTimePipeline(filterMatch)),
        QueryAnalyticsLog.aggregate(getTopIntentsPipeline(filterMatch)),
        QueryAnalyticsLog.aggregate(getLanguageDistributionPipeline(filterMatch)),
        QueryAnalyticsLog.aggregate(getTopUnansweredQueriesPipeline(filterMatch)),
        QueryAnalyticsLog.aggregate(getTopQueriesPipeline(filterMatch)),
        QueryAnalyticsLog.aggregate(getDocUsagePipeline(filterMatch))
      ]);

      const summary = summaryResult[0] || {
        totalQueries: 0,
        unansweredCount: 0,
        clarificationCount: 0,
        cachedCount: 0,
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        avgLatencyMs: 0,
        latencies: []
      };

      const totalRated = (summary.thumbsUpCount || 0) + (summary.thumbsDownCount || 0);
      const satisfactionRate = totalRated > 0 ? (summary.thumbsUpCount / totalRated) * 100 : 100;
      const unansweredRate = summary.totalQueries > 0 ? (summary.unansweredCount / summary.totalQueries) * 100 : 0;
      const clarificationRate = summary.totalQueries > 0 ? (summary.clarificationCount / summary.totalQueries) * 100 : 0;
      const cacheHitRate = summary.totalQueries > 0 ? (summary.cachedCount / summary.totalQueries) * 100 : 0;
      const p95Latency = calculateP95(summary.latencies || []);

      // Derive a per-day latency series (avg + p95) and drop the raw latency arrays.
      const latencySeries = queriesOverTime.map(({ latencies, ...row }) => ({
        ...row,
        avgLatencyMs: Math.round(row.avgLatencyMs || 0),
        p95LatencyMs: Math.round(calculateP95(latencies || []))
      }));

      const queryDurationMs = Date.now() - startTime;

      return res.json({
        executionTimeMs: queryDurationMs,
        filters: { startDate, endDate, includeSeeded },
        kpis: {
          totalQueries: summary.totalQueries,
          unansweredCount: summary.unansweredCount,
          unansweredRate: Math.round(unansweredRate * 10) / 10,
          clarificationRate: Math.round(clarificationRate * 10) / 10,
          cacheHitRate: Math.round(cacheHitRate * 10) / 10,
          satisfactionRate: Math.round(satisfactionRate * 10) / 10,
          avgLatencyMs: Math.round(summary.avgLatencyMs || 0),
          p95LatencyMs: Math.round(p95Latency)
        },
        queriesOverTime: latencySeries,
        topIntents,
        languageDistribution,
        topUnanswered,
        topQueries,
        docUsage
      });
    }

    // In-memory fallback aggregation
    let filtered = memoryAnalyticsStore;
    if (includeSeeded === false || includeSeeded === 'false') {
      filtered = filtered.filter(it => !it.isSeeded);
    } else if (includeSeeded === 'only') {
      filtered = filtered.filter(it => it.isSeeded);
    }

    const total = filtered.length;
    const unanswered = filtered.filter(it => it.isUnanswered).length;
    const clarified = filtered.filter(it => it.isClarification).length;
    const cached = filtered.filter(it => it.cached).length;
    const thumbsUp = filtered.filter(it => it.rating === 'up').length;
    const thumbsDown = filtered.filter(it => it.rating === 'down').length;
    const latencies = filtered.map(it => it.totalLatencyMs || 0);
    const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    const byDay = {};
    filtered.forEach(it => {
      const date = new Date(it.createdAt).toISOString().slice(0, 10);
      if (!byDay[date]) byDay[date] = { date, count: 0, unanswered: 0, cached: 0, latencies: [] };
      byDay[date].count += 1;
      if (it.isUnanswered) byDay[date].unanswered += 1;
      if (it.cached) byDay[date].cached += 1;
      byDay[date].latencies.push(it.totalLatencyMs || 0);
    });
    const queriesOverTime = Object.keys(byDay)
      .sort()
      .map(date => {
        const { latencies: dayLatencies, ...row } = byDay[date];
        return {
          ...row,
          avgLatencyMs: Math.round(dayLatencies.reduce((a, b) => a + b, 0) / (dayLatencies.length || 1)),
          p95LatencyMs: Math.round(calculateP95(dayLatencies))
        };
      });

    const queryDurationMs = Date.now() - startTime;

    return res.json({
      executionTimeMs: queryDurationMs,
      inMemory: true,
      kpis: {
        totalQueries: total,
        unansweredCount: unanswered,
        unansweredRate: total ? Math.round((unanswered / total) * 1000) / 10 : 0,
        clarificationRate: total ? Math.round((clarified / total) * 1000) / 10 : 0,
        cacheHitRate: total ? Math.round((cached / total) * 1000) / 10 : 0,
        satisfactionRate: (thumbsUp + thumbsDown) ? Math.round((thumbsUp / (thumbsUp + thumbsDown)) * 1000) / 10 : 100,
        avgLatencyMs: Math.round(avgLatency),
        p95LatencyMs: Math.round(calculateP95(latencies))
      },
      queriesOverTime,
      topIntents: [],
      languageDistribution: [],
      topUnanswered: [],
      topQueries: [],
      docUsage: []
    });
  } catch (error) {
    console.error(`[Analytics Aggregation Error]: ${error.message}`);
    return res.status(500).json({ error: 'Failed to aggregate analytics data' });
  }
});

/**
 * GET /api/admin/analytics/export-csv
 * Exports tabular analytics data as CSV download
 */
router.get('/export-csv', requireAdminAuth, async (req, res) => {
  const { table = 'unanswered', startDate, endDate, includeSeeded = 'true' } = req.query;

  try {
    const filterMatch = buildMatchFilter({ startDate, endDate, includeSeeded });
    let rows = [];
    let headers = [];

    if (table === 'unanswered') {
      headers = ['Normalized Query', 'Sample Query', 'Language', 'Decision', 'Occurrences', 'Last Seen'];
      const data = await QueryAnalyticsLog.aggregate(getTopUnansweredQueriesPipeline(filterMatch, 500));
      rows = data.map(d => [
        `"${(d.normalizedQuery || '').replace(/"/g, '""')}"`,
        `"${(d.sampleQuery || '').replace(/"/g, '""')}"`,
        d.language,
        d.decision,
        d.count,
        new Date(d.lastSeen).toISOString()
      ]);
    } else if (table === 'intents') {
      headers = ['Intent', 'Count', 'Avg Confidence'];
      const data = await QueryAnalyticsLog.aggregate(getTopIntentsPipeline(filterMatch, 500));
      rows = data.map(d => [d.intent, d.count, d.avgConfidence]);
    } else if (table === 'queries') {
      headers = ['Query', 'Intent', 'Count'];
      const data = await QueryAnalyticsLog.aggregate(getTopQueriesPipeline(filterMatch, 500));
      rows = data.map(d => [
        `"${(d.query || '').replace(/"/g, '""')}"`,
        d.intent,
        d.count
      ]);
    } else {
      headers = ['Date', 'Total Queries', 'Unanswered', 'Cached'];
      const data = await QueryAnalyticsLog.aggregate(getQueriesOverTimePipeline(filterMatch));
      rows = data.map(d => [d.date, d.count, d.unanswered, d.cached]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics_${table}_${Date.now()}.csv`);

    await recordAuditLog({
      actorId: req.admin?.id,
      action: 'analytics_export',
      targetType: 'analytics',
      targetId: table,
      meta: { rowCount: rows.length, table },
      req
    });

    return res.send(csvContent);
  } catch (error) {
    console.error(`[Analytics CSV Export Error]: ${error.message}`);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});

module.exports = {
  analyticsRouter: router,
  logQueryAnalytics,
  memoryAnalyticsStore
};

