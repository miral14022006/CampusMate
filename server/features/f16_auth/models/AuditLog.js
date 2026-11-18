const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  targetType: {
    type: String,
    required: true,
    index: true
  },
  targetId: {
    type: String,
    default: null,
    index: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipHash: {
    type: String,
    default: null
  },
  at: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

AuditLogSchema.index({ action: 1, at: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
