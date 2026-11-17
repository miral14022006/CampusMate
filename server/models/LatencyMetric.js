const mongoose = require('mongoose');

const LatencyMetricSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  sessionId: { type: String, index: true },
  query: { type: String },
  language: { type: String, default: 'en' },
  intent: { type: String },
  cached: { type: Boolean, default: false },
  totalGatewayLatencyMs: { type: Number, required: true },
  nlpExecutionTimeMs: { type: Number, default: 0 },
  stageLatencies: {
    type: Map,
    of: Number,
    default: {}
  },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('LatencyMetric', LatencyMetricSchema);

