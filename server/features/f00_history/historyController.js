const express = require('express');
const router = express.Router();
const PersistentConversation = require('./conversationModel');
const Message = require('../../models/Message');
const { optionalAuth } = require('../f16_auth');

// In-memory fallback repository when running in transient / offline mode
const memoryConversationStore = [];

function getMemoryStore(scopeKey, isUser = false) {
  if (isUser) {
    return memoryConversationStore.filter(c => c.userId === scopeKey && !c.archived);
  }
  return memoryConversationStore.filter(c => c.clientId === scopeKey && !c.userId && !c.archived);
}

/**
 * Middleware: Extract and validate user or anonymous clientId header
 */
function requireClientScope(req, res, next) {
  if (req.user && req.user._id) {
    req.scopeType = 'user';
    req.scopeId = req.user._id.toString();
    return next();
  }

  // Guest mode check
  if (process.env.GUEST_MODE === 'false') {
    return res.status(401).json({ error: 'Guest access is disabled. Please sign in.' });
  }

  const clientId = req.headers['x-client-id'] || req.query.clientId;
  if (!clientId) {
    return res.status(400).json({ error: 'X-Client-Id header is required' });
  }
  req.clientId = String(clientId);
  req.scopeType = 'guest';
  req.scopeId = String(clientId);
  next();
}

/**
 * Helper to build ownership query
 */
function buildScopeQuery(req, extra = {}) {
  if (req.scopeType === 'user') {
    return { userId: req.scopeId, ...extra };
  }
  return { clientId: req.scopeId, userId: { $in: [null, undefined, ''] }, ...extra };
}

/**
 * GET /api/conversations
 * Paginated list of conversations belonging exclusively to req.clientId or req.user
 */
router.get('/', optionalAuth, requireClientScope, async (req, res) => {
  const { search = '', cursor, limit = 20 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 50);

  try {
    if (PersistentConversation.db && PersistentConversation.db.readyState === 1) {
      const query = buildScopeQuery(req, { archived: false });

      if (search) {
        query.$text = { $search: search };
      }

      if (cursor) {
        query.updatedAt = { $lt: new Date(cursor) };
      }

      const items = await PersistentConversation.find(query)
        .sort({ pinned: -1, updatedAt: -1 })
        .limit(parsedLimit + 1)
        .lean();

      const hasMore = items.length > parsedLimit;
      const list = hasMore ? items.slice(0, parsedLimit) : items;
      const nextCursor = hasMore ? list[list.length - 1].updatedAt.toISOString() : null;

      return res.json({ conversations: list, nextCursor });
    }

    // In-memory fallback
    let list = getMemoryStore(req.scopeId, req.scopeType === 'user');
    if (search) {
      list = list.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
    }
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt));
    return res.json({ conversations: list.slice(0, parsedLimit), nextCursor: null });
  } catch {
    console.error('[History GET /api/conversations Error]:', err.message);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * POST /api/conversations
 * Create empty conversation
 */
router.post('/', optionalAuth, requireClientScope, async (req, res) => {
  const { title = 'New Conversation' } = req.body;
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    if (PersistentConversation.db && PersistentConversation.db.readyState === 1) {
      const created = await PersistentConversation.create({
        sessionId,
        clientId: req.clientId || req.scopeId,
        userId: req.scopeType === 'user' ? req.scopeId : null,
        title,
        updatedAt: new Date()
      });
      return res.status(201).json(created);
    }

    const item = {
      _id: `mem_conv_${Date.now()}`,
      sessionId,
      clientId: req.clientId || req.scopeId,
      userId: req.scopeType === 'user' ? req.scopeId : null,
      title,
      pinned: false,
      archived: false,
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryConversationStore.push(item);
    return res.status(201).json(item);
  } catch {
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Retrieve messages belonging to a conversation
 */
router.get('/:id/messages', optionalAuth, requireClientScope, async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ownership
    if (PersistentConversation.db && PersistentConversation.db.readyState === 1) {
      const query = buildScopeQuery(req, { sessionId: id });
      const conv = await PersistentConversation.findOne(query);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found or unauthorized' });
      }

      const messages = await Message.find({ sessionId: id }).sort({ createdAt: 1 }).lean();
      return res.json({ sessionId: id, messages, nextCursor: null });
    }

    const conv = memoryConversationStore.find(c => c.sessionId === id && (req.scopeType === 'user' ? c.userId === req.scopeId : c.clientId === req.scopeId));
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found in memory' });
    }
    return res.json({ sessionId: id, messages: [], nextCursor: null });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * PATCH /api/conversations/:id
 * Rename, pin, or archive
 */
router.patch('/:id', optionalAuth, requireClientScope, async (req, res) => {
  const { id } = req.params;
  const { title, pinned, archived } = req.body;

  try {
    const updates = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (pinned !== undefined) updates.pinned = Boolean(pinned);
    if (archived !== undefined) updates.archived = Boolean(archived);

    if (PersistentConversation.db && PersistentConversation.db.readyState === 1) {
      const query = buildScopeQuery(req, { sessionId: id });
      const updated = await PersistentConversation.findOneAndUpdate(
        query,
        { $set: updates },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'Conversation not found or unauthorized' });
      }
      return res.json(updated);
    }

    const idx = memoryConversationStore.findIndex(c => c.sessionId === id && (req.scopeType === 'user' ? c.userId === req.scopeId : c.clientId === req.scopeId));
    if (idx === -1) {
      return res.status(404).json({ error: 'Conversation not found in memory' });
    }
    memoryConversationStore[idx] = { ...memoryConversationStore[idx], ...updates };
    return res.json(memoryConversationStore[idx]);
  } catch {
    return res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete single conversation and its messages
 */
router.delete('/:id', optionalAuth, requireClientScope, async (req, res) => {
  const { id } = req.params;

  try {
    if (PersistentConversation.db && PersistentConversation.db.readyState === 1) {
      const query = buildScopeQuery(req, { sessionId: id });
      const deleted = await PersistentConversation.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ error: 'Conversation not found or unauthorized' });
      }
      await Message.deleteMany({ sessionId: id });
      return res.json({ success: true });
    }

    const idx = memoryConversationStore.findIndex(c => c.sessionId === id && (req.scopeType === 'user' ? c.userId === req.scopeId : c.clientId === req.scopeId));
    if (idx !== -1) {
      memoryConversationStore.splice(idx, 1);
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * DELETE /api/conversations
 * Clear all conversations for current scope
 */
router.delete('/', optionalAuth, requireClientScope, async (req, res) => {
  try {
    if (PersistentConversation.db && PersistentConversation.db.readyState === 1) {
      const query = buildScopeQuery(req);
      const convs = await PersistentConversation.find(query, { sessionId: 1 }).lean();
      const sessionIds = convs.map(c => c.sessionId);
      await PersistentConversation.deleteMany(query);
      await Message.deleteMany({ sessionId: { $in: sessionIds } });
      return res.json({ success: true, deletedCount: convs.length });
    }

    const initialLen = memoryConversationStore.length;
    for (let i = memoryConversationStore.length - 1; i >= 0; i--) {
      const item = memoryConversationStore[i];
      const match = req.scopeType === 'user' ? item.userId === req.scopeId : item.clientId === req.scopeId;
      if (match) {
        memoryConversationStore.splice(i, 1);
      }
    }
    return res.json({ success: true, deletedCount: initialLen - memoryConversationStore.length });
  } catch {
    return res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

module.exports = {
  historyRouter: router,
  requireClientScope,
  requireClientId: requireClientScope
};

