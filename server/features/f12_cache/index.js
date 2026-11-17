const { ServerCacheManager, serverCacheManager, DEFAULT_CACHE_TTL } = require('./cacheManager');
const { generateCacheKey, normalizeQuery, normalizeSlots } = require('./cacheKey');
const { latencyTrackerMiddleware } = require('./latencyMiddleware');
const adminCacheRouter = require('./adminRoutes');

module.exports = {
  ServerCacheManager,
  serverCacheManager,
  DEFAULT_CACHE_TTL,
  generateCacheKey,
  normalizeQuery,
  normalizeSlots,
  latencyTrackerMiddleware,
  adminCacheRouter
};

