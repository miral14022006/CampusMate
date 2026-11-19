const { analyticsRouter, logQueryAnalytics, memoryAnalyticsStore } = require('./analyticsController');
const aggregations = require('./analyticsAggregations');
const dashboardRouter = require('./dashboardRoutes');

module.exports = {
  analyticsRouter,
  dashboardRouter,
  logQueryAnalytics,
  memoryAnalyticsStore,
  ...aggregations
};

