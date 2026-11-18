const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'signup',
  'login',
  'logout',
  'chat_query',
  'document_view',
  'document_download',
  'calendar_add',
  'feedback',
  'page_view'
];

const ActivityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    clientId: {
      type: String,
      default: null,
      index: true
    },
    actorType: {
      type: String,
      enum: ['student', 'guest', 'admin'],
      default: 'guest',
      index: true
    },
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
      index: true
    },
    meta: {
      docId: { type: String, default: null },
      page: { type: Number, default: null },
      conversationId: { type: String, default: null },
      intent: { type: String, default: null },
      language: { type: String, default: null },
      category: { type: String, default: null },
      messageId: { type: String, default: null },
      rating: { type: String, default: null },
      semester: { type: Number, default: null },
      branch: { type: String, default: null },
      path: { type: String, default: null },
      source: { type: String, default: null }
    },
    ipHash: {
      type: String,
      default: null
    },
    userAgentFamily: {
      type: String,
      default: 'unknown'
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: false }
);

// Required query paths for the activity stream and dashboards.
ActivityEventSchema.index({ type: 1, createdAt: -1 });
ActivityEventSchema.index({ userId: 1, createdAt: -1 });
ActivityEventSchema.index({ 'meta.docId': 1, createdAt: -1 });
ActivityEventSchema.index({ clientId: 1, createdAt: -1 });
ActivityEventSchema.index({ createdAt: -1 });

// Optional retention. Mongo accepts expireAfterSeconds on a date field.
const retentionDays = Number(process.env.ACTIVITY_RETENTION_DAYS || 0);
if (Number.isFinite(retentionDays) && retentionDays > 0) {
  ActivityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 86400 });
}

const ActivityEvent = mongoose.model('ActivityEvent', ActivityEventSchema);

module.exports = ActivityEvent;
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
