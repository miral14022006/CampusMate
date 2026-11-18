const mongoose = require('mongoose');

const SessionFamilySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  familyId: {
    type: String,
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipHash: {
    type: String,
    default: ''
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '0s' } // TTL index automatically cleans up expired sessions
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SessionFamily', SessionFamilySchema);
