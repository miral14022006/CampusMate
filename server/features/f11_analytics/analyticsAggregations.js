/**
 * High-performance MongoDB Aggregation Pipelines for Feature 11 Analytics
 */

function buildMatchFilter({ startDate, endDate, includeSeeded }) {
  const match = {};

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  if (includeSeeded === false || includeSeeded === 'false') {
    match.isSeeded = false;
  } else if (includeSeeded === 'only') {
    match.isSeeded = true;
  }

  return match;
}

/**
 * 1. Summary KPI Metrics
 */
function getSummaryPipeline(filterMatch) {
  return [
    { $match: filterMatch },
    {
      $group: {
        _id: null,
        totalQueries: { $sum: 1 },
        unansweredCount: { $sum: { $cond: ['$isUnanswered', 1, 0] } },
        clarificationCount: { $sum: { $cond: ['$isClarification', 1, 0] } },
        cachedCount: { $sum: { $cond: ['$cached', 1, 0] } },
        thumbsUpCount: { $sum: { $cond: [{ $eq: ['$rating', 'up'] }, 1, 0] } },
        thumbsDownCount: { $sum: { $cond: [{ $eq: ['$rating', 'down'] }, 1, 0] } },
        avgLatencyMs: { $avg: '$totalLatencyMs' },
        latencies: { $push: '$totalLatencyMs' }
      }
    }
  ];
}

/**
 * 2. Queries Over Time (Grouped by Day)
 */
function getQueriesOverTimePipeline(filterMatch) {
  return [
    { $match: filterMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        unanswered: { $sum: { $cond: ['$isUnanswered', 1, 0] } },
        cached: { $sum: { $cond: ['$cached', 1, 0] } },
        avgLatencyMs: { $avg: '$totalLatencyMs' },
        latencies: { $push: '$totalLatencyMs' }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
        unanswered: 1,
        cached: 1,
        avgLatencyMs: { $round: ['$avgLatencyMs', 1] },
        latencies: 1
      }
    }
  ];
}

/**
 * 3. Top 20 Intents
 */
function getTopIntentsPipeline(filterMatch, limit = 20) {
  return [
    { $match: filterMatch },
    {
      $group: {
        _id: '$intent',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        intent: '$_id',
        count: 1,
        avgConfidence: { $round: ['$avgConfidence', 3] }
      }
    }
  ];
}

/**
 * 4. Language Distribution
 */
function getLanguageDistributionPipeline(filterMatch) {
  return [
    { $match: filterMatch },
    {
      $group: {
        _id: '$language',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        language: '$_id',
        count: 1
      }
    }
  ];
}

/**
 * 5. Top Unanswered / Fallback / IDK Queries
 */
function getTopUnansweredQueriesPipeline(filterMatch, limit = 25) {
  return [
    {
      $match: {
        ...filterMatch,
        isUnanswered: true
      }
    },
    {
      $group: {
        _id: '$normalizedQuery',
        sampleQuery: { $first: '$query' },
        language: { $first: '$language' },
        lastDecision: { $first: '$decision' },
        count: { $sum: 1 },
        lastSeen: { $max: '$createdAt' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        normalizedQuery: '$_id',
        sampleQuery: 1,
        language: 1,
        decision: '$lastDecision',
        count: 1,
        lastSeen: 1
      }
    }
  ];
}

/**
 * 6. Top Queries (Normalized)
 */
function getTopQueriesPipeline(filterMatch, limit = 20) {
  return [
    { $match: filterMatch },
    {
      $group: {
        _id: '$normalizedQuery',
        sampleQuery: { $first: '$query' },
        intent: { $first: '$intent' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: '$sampleQuery',
        intent: 1,
        count: 1
      }
    }
  ];
}

/**
 * 7. Per-Source Document Usage
 */
function getDocUsagePipeline(filterMatch) {
  return [
    {
      $match: {
        ...filterMatch,
        sourceDoc: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$sourceDoc',
        citationsCount: { $sum: 1 }
      }
    },
    { $sort: { citationsCount: -1 } },
    { $limit: 15 },
    {
      $project: {
        _id: 0,
        docName: '$_id',
        count: '$citationsCount'
      }
    }
  ];
}

/**
 * Calculate p95 from array of numbers
 */
function calculateP95(numbers = []) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index] !== undefined ? sorted[index] : sorted[sorted.length - 1];
}

module.exports = {
  buildMatchFilter,
  getSummaryPipeline,
  getQueriesOverTimePipeline,
  getTopIntentsPipeline,
  getLanguageDistributionPipeline,
  getTopUnansweredQueriesPipeline,
  getTopQueriesPipeline,
  getDocUsagePipeline,
  calculateP95
};

