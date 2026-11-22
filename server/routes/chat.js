const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { PersistentConversation } = require('../features/f00_history');
const { requireAuth } = require('../features/f16_auth');
const { recordInBackground } = require('../features/f17_activity/activityService');
const { nlpClient } = require('../services/nlpClient');

const router = express.Router();

/**
 * POST /api/chat & POST /api/chat/message
 * Production Chat endpoint: connects to modern FastAPI NLP/RAG microservice with automatic fallback.
 */
const handleChat = async (req, res) => {
  const { query, sessionId = `session_${Date.now()}` } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    const createdMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const studentId = req.user?.id || 'anonymous_user';

    let nlpData = null;
    try {
      nlpData = await nlpClient.query(query.trim(), sessionId, {
        branch: req.user?.branch || null,
        semester: req.user?.semester || null
      });
    } catch (nlpErr) {
      console.warn(`[Chat] NLP service call failed (${nlpErr.message}). Using offline message.`);
      nlpData = {
        answer: "CampusMate AI Assistant is temporarily unavailable. Please try again shortly.",
        reply: "CampusMate AI Assistant is temporarily unavailable. Please try again shortly.",
        language: "en",
        intent: "out_of_scope",
        confidence: 0.0,
        source_doc: null,
        citations: [],
        grounded: false,
        generation_mode: "offline",
        decision: "FALLBACK",
        decision_reason: "NLP_UNAVAILABLE",
        execution_time_ms: 10
      };
    }

    // Save message to MongoDB
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

        // Save assistant answer
        await Message.create({
          sessionId,
          sender: 'bot',
          text: nlpData.answer,
          metadata: {
            mode: nlpData.generation_mode,
            grounded: nlpData.grounded,
            source_doc: nlpData.source_doc,
            citations: nlpData.citations
          }
        });
      }

      await Conversation.findOneAndUpdate(
        { sessionId },
        {
          $inc: { messageCount: 2 },
          $set: { dominantLanguage: nlpData.language || 'en', channel: 'web', lastActivity: new Date() }
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
            lastMessagePreview: (nlpData.answer || '').slice(0, 80),
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
        intent: nlpData.intent || 'unknown',
        language: nlpData.language || 'en',
        category: nlpData.decision || 'ANSWER',
        messageId: createdMessageId
      }
    });

    return res.json({
      messageId: createdMessageId,
      sessionId,
      answer: nlpData.answer,
      reply: nlpData.answer,
      language: nlpData.language,
      detected_language: nlpData.language,
      intent: nlpData.intent,
      confidence: nlpData.confidence,
      source_doc: nlpData.source_doc,
      entities: nlpData.entities || [],
      citations: nlpData.citations || [],
      calendar_events: nlpData.calendar_events || [],
      grounded: nlpData.grounded,
      generation_mode: nlpData.generation_mode,
      hallucination_score: nlpData.hallucination_score || 0.0,
      decision: nlpData.decision,
      decision_reason: nlpData.decision_reason,
      clarification_question: nlpData.clarification_question,
      quick_replies: nlpData.quick_replies || [],
      dialogue_state: nlpData.dialogue_state,
      execution_time_ms: nlpData.execution_time_ms
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
