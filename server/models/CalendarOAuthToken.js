const mongoose = require('mongoose');

const CalendarOAuthTokenSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    encryptedAccessToken: {
      type: String,
      required: true
    },
    encryptedRefreshToken: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true
    },
    scope: {
      type: String,
      default: ''
    },
    googleEmail: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('CalendarOAuthToken', CalendarOAuthTokenSchema);
