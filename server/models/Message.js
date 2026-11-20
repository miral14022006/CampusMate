const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  channel: {
    type: String,
    default: 'web'
  },
  intent: {
    type: String,
    default: null
  },
  confidence: {
    type: Number,
    default: null
  },
  sourceDoc: {
    type: String,
    default: null
  },
  entities: {
    type: Array,
    default: []
  },
  calendarEvents: {
    type: Array,
    default: []
  },
  decision: {
    type: String,
    default: 'ANSWER'
  },
  decisionReason: {
    type: String,
    default: 'ANSWERED'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);

