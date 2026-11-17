const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true
  },
  rating: {
    type: String,
    enum: ['up', 'down', 'implicit_failure'],
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: [
      'wrong answer',
      'wrong language',
      'outdated',
      'not helpful',
      'other',
      'implicit_low_confidence',
      'implicit_fallback',
      'implicit_idk',
      null
    ],
    default: null
  },
  comment: {
    type: String,
    default: ''
  },
  correctIntent: {
    type: String,
    default: null
  },
  correctDoc: {
    type: String,
    default: null
  },
  // Snapshot of pipeline output at time of response
  pipelineSnapshot: {
    language: { type: String, default: 'en' },
    intent: { type: String, default: null },
    confidence: { type: Number, default: 0.0 },
    retrievedChunkIds: { type: [String], default: [] },
    retrievedDocs: { type: [String], default: [] },
    answer: { type: String, default: '' },
    mode: { type: String, default: 'rag' },
    decision: { type: String, default: 'ANSWER' }
  },
  // Human review & data curation lifecycle
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);

