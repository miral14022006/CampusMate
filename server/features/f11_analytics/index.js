const { analyticsRouter, logQueryAnalytics, memoryAnalyticsStore } = require('./analyticsController');
const aggregations = require('./analyticsAggregations');

module.exports = {
  analyticsRouter,
  logQueryAnalytics,
  memoryAnalyticsStore,
  ...aggregations
};

