const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'superadmin'],
    default: 'student',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'invited'],
    default: 'active',
    index: true
  },
  semester: {
    type: Number,
    min: 1,
    max: 12,
    default: null
  },
  branch: {
    type: String,
    trim: true,
    default: null
  },
  academicYear: {
    type: String,
    enum: ['First Year', 'Second Year', 'Third Year', 'Fourth Year', null],
    default: null,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  failedLogins: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isDemo: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
