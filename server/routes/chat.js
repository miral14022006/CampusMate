const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { PersistentConversation } = require('../features/f00_history');
const { requireAuth, optionalAuth } = require('../features/f16_auth');
const { recordInBackground } = require('../features/f17_activity/activityService');

const router = express.Router();

const MAINTENANCE_MESSAGE =
  'CampusMate AI Assistant is undergoing scheduled maintenance. The conversational service will be restored shortly.';

/**
 * POST /api/chat & POST /api/chat/message
 * Chat endpoint: safely disconnected from old RAG/NLP pipeline, returning a maintenance response while preserving message history.
 */
const handleChat = async (req, res) => {
  const { query, sessionId = `session_${Date.now()}` } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    const createdMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const studentId = req.user?.id || 'anonymous_user';

    try {
      if (Message.db && Message.db.readyState === 1) {
        // Save user question
        await Message.create({
          sessionId,
          sender: 'user',
          text: query.trim(),
          studentId: req.user?.id || null,
          metadata: {
            channel: 'web',
            studentBranch: req.user?.branch || null,
            studentSemester: req.user?.semester || null
          }
        });

        // Save assistant maintenance message
        await Message.create({
          sessionId,
          sender: 'bot',
          text: MAINTENANCE_MESSAGE,
          metadata: {
            mode: 'maintenance',
            grounded: false
          }
        });
      }

      await Conversation.findOneAndUpdate(
        { sessionId },
        {
          $inc: { messageCount: 2 },
          $set: { dominantLanguage: 'en', channel: 'web', lastActivity: new Date() }
        },
        { upsert: true, new: true }
      );

      const clientId = req.headers['x-client-id'] || 'anonymous_client';
      const cleanTitle = query.trim().replace(/[\r\n]+/g, ' ').slice(0, 40);
      await PersistentConversation.findOneAndUpdate(
        { sessionId },
        {
          $setOnInsert: {
            sessionId,
            clientId,
            title: cleanTitle || 'New Conversation',
            createdAt: new Date()
          },
          $set: {
            lastMessagePreview: MAINTENANCE_MESSAGE.slice(0, 80),
            updatedAt: new Date()
          },
          $inc: { messageCount: 2 }
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.warn(`[Server] Mongo persistence skipped: ${dbErr.message}`);
    }

    recordInBackground({
      req,
      type: 'chat_query',
      meta: {
        conversationId: sessionId,
        intent: 'maintenance',
        language: 'en',
        category: 'MAINTENANCE',
        messageId: createdMessageId
      }
    });

    return res.json({
      messageId: createdMessageId,
      sessionId,
      answer: MAINTENANCE_MESSAGE,
      reply: MAINTENANCE_MESSAGE,
      language: 'en',
      detected_language: 'en',
      intent: 'maintenance',
      confidence: 1.0,
      source_doc: null,
      entities: [],
      citations: [],
      calendar_events: [],
      grounded: false,
      generation_mode: 'maintenance',
      hallucination_score: 0.0,
      decision: 'MAINTENANCE',
      decision_reason: 'SERVICE_UNDER_MAINTENANCE',
      clarification_question: null,
      quick_replies: [],
      contact_info: null,
      standalone_query: query,
      is_follow_up: false,
      is_reset: false,
      dialogue_state: null,
      execution_time_ms: 10
    });
  } catch (error) {
    console.error(`[Server Error] /api/chat: ${error.message}`);
    return res.status(500).json({ error: 'Internal gateway error.' });
  }
};

router.post('/', requireAuth, handleChat);
router.post('/message', requireAuth, handleChat);

/**
 * GET /api/chat/history/:sessionId
 * Retrieves previous conversation messages for the session.
 */
router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 }).lean();
    return res.json({ sessionId, messages });
  } catch {
    return res.status(200).json({ sessionId, messages: [] });
  }
});

module.exports = router;
