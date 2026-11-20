const mongoose = require('mongoose');

const QueryAnalyticsLogSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true },
  query: { type: String, required: true },
  normalizedQuery: { type: String, index: true },
  language: { type: String, index: true, default: 'en' },
  channel: { type: String, index: true, default: 'web' },
  intent: { type: String, index: true },
  confidence: { type: Number, default: 0.0 },
  sourceDoc: { type: String, index: true, default: null },
  decision: { type: String, index: true, default: 'ANSWER' }, // ANSWER, CLARIFY, FALLBACK
  decisionReason: { type: String, index: true, default: 'ANSWERED' },
  isUnanswered: { type: Boolean, index: true, default: false }, // true if fallback, idk, out_of_scope
  isClarification: { type: Boolean, index: true, default: false },
  cached: { type: Boolean, index: true, default: false },
  rating: { type: String, default: null }, // 'up', 'down', null
  totalLatencyMs: { type: Number, default: 0 },
  nlpExecutionTimeMs: { type: Number, default: 0 },
  stageLatencies: {
    type: Map,
    of: Number,
    default: {}
  },
  isSeeded: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound indexes for sub-300ms 50k analytics aggregation queries
QueryAnalyticsLogSchema.index({ createdAt: -1, isSeeded: 1 });
QueryAnalyticsLogSchema.index({ createdAt: -1, intent: 1 });
QueryAnalyticsLogSchema.index({ createdAt: -1, language: 1 });
QueryAnalyticsLogSchema.index({ createdAt: -1, isUnanswered: 1 });
QueryAnalyticsLogSchema.index({ normalizedQuery: 1, isUnanswered: 1 });

module.exports = mongoose.model('QueryAnalyticsLog', QueryAnalyticsLogSchema);

