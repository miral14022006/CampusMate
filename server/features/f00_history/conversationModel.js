const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clientId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    default: null,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  lastMessagePreview: {
    type: String,
    default: ''
  },
  messageCount: {
    type: Number,
    default: 0
  },
  pinned: {
    type: Boolean,
    default: false,
    index: true
  },
  archived: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for performant client-scoped sorting and pagination
ConversationSchema.index({ clientId: 1, updatedAt: -1 });
ConversationSchema.index({ clientId: 1, pinned: -1, updatedAt: -1 });
// Text search across conversation titles
ConversationSchema.index({ title: 'text' });

module.exports = mongoose.model('PersistentConversation', ConversationSchema);

