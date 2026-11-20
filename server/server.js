require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const chatRouter = require('./routes/chat');
const { latencyTrackerMiddleware, adminCacheRouter, serverCacheManager } = require('./features/f12_cache');
const { documentAdminRouter } = require('./features/f08_admin');
const { calendarRoutes } = require('./features/f15_calendar');
const { feedbackRouter } = require('./features/f10_feedback');
const { analyticsRouter } = require('./features/f11_analytics');
const dashboardRouter = require('./features/f11_analytics/dashboardRoutes');
const { activityRoutes } = require('./features/f17_activity');
const { documentRoutes } = require('./features/f18_documents_public');
const { historyRouter } = require('./features/f00_history');
const { studentAuthRoutes, adminAuthRoutes } = require('./features/f16_auth');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

// Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// CORS allowlist configuration for external client consumers / integrations
const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const allowedOrigins = (process.env.CORS_ORIGIN || defaultCorsOrigins.join(',')).split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// Global Rate Limiting for Public APIs disabled in development, generous in production
if (process.env.NODE_ENV === 'production') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', apiLimiter);
}

// Input Length Limits on JSON
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Feature 12: Latency tracking middleware
app.use(latencyTrackerMiddleware);

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Primary MERN chat routes, Auth routes, Admin routes, Bot routes
app.use('/api/auth', studentAuthRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/chat', chatRouter);
app.use('/api/conversations', historyRouter);
app.use('/api/admin', adminCacheRouter);
app.use('/api/admin', documentAdminRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/admin/feedback', feedbackRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin/dashboard', dashboardRouter);
app.use('/api/documents', documentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check
app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(mongoStatus === 'connected' ? 200 : 503).json({
    status: mongoStatus === 'connected' ? 'ok' : 'degraded',
    service: 'server-gateway',
    server: 'ok',
    mongo: mongoStatus
  });
});

// Version check with Git SHA and build time
app.get('/api/version', (req, res) => {
  res.json({
    service: 'server-gateway',
    git_sha: process.env.GIT_SHA || 'unknown',
    build_time: process.env.BUILD_TIME || 'unknown',
    node_env: process.env.NODE_ENV || 'development'
  });
});

// Optional MongoDB connect
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 2000
  }).then(() => {
    console.log('[Server] Connected to MongoDB');
  }).catch((err) => {
    console.warn(`[Server] MongoDB connection failed (${err.message}). Continuing in transient mode.`);
  });

  // Optional Redis connect. Dashboards use the f12 cache manager (60s TTL).
  if (process.env.REDIS_URL) {
    try {
      const { createClient } = require('redis');
      const redis = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: false } });
      redis.on('error', (err) => console.warn(`[Server] Redis error: ${err.message}`));
      redis.connect().then(() => {
        serverCacheManager.setRedisClient(redis);
        const { sessionManager } = require('./features/f06_sessions');
        sessionManager.setRedisClient(redis);
        console.log('[Server] Connected to Redis');
      }).catch((err) => console.warn(`[Server] Redis unavailable (${err.message}). Using in-memory cache.`));
    } catch (err) {
      console.warn(`[Server] Redis client not initialised (${err.message}).`);
    }
  }

  app.listen(PORT, () => {
    console.log(`[Server] API Gateway listening on port ${PORT}`);
  });
}

module.exports = app;
