const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { PersistentConversation } = require('../features/f00_history');
const { optionalAuth, requireAuth } = require('../features/f16_auth');
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

    // Retrieve recent conversation history for multi-turn context
    let conversationHistory = [];
    try {
      if (Message.db && Message.db.readyState === 1) {
        const priorMsgs = await Message.find({ sessionId }).sort({ createdAt: -1 }).limit(6).lean();
        conversationHistory = priorMsgs.reverse().map(m => ({
          role: m.sender === 'assistant' ? 'assistant' : 'user',
          content: m.text
        }));
      }
    } catch (histErr) {
      console.warn(`[Chat] Could not load message history: ${histErr.message}`);
    }

    let nlpData = null;
    try {
      nlpData = await nlpClient.query(
        query.trim(),
        sessionId,
        {
          branch: req.user?.branch || null,
          semester: req.user?.semester || null
        },
        conversationHistory
      );
    } catch (nlpErr) {
      const errMsg = nlpErr.message || (typeof nlpErr === 'object' ? JSON.stringify(nlpErr) : String(nlpErr));
      console.warn(`[Chat] NLP service call failed (${errMsg}). Using offline message.`);
      nlpData = {
        answer: "I could not retrieve an answer at this moment. Please check back shortly or consult your department circular.",
        reply: "I could not retrieve an answer at this moment. Please check back shortly or consult your department circular.",
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
          language: nlpData.language || 'en'
        });

        // Save assistant answer
        await Message.create({
          sessionId,
          sender: 'assistant',
          text: nlpData.answer || nlpData.reply || '',
          language: nlpData.language || 'en',
          intent: nlpData.intent || null,
          confidence: nlpData.confidence || null,
          sourceDoc: nlpData.source_doc || null,
          decision: nlpData.decision || 'ANSWER',
          decisionReason: nlpData.decision_reason || 'ANSWERED'
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

// Allow authenticated students as well as public / prospective students (attaching req.user when logged in)
router.post('/', optionalAuth, handleChat);
router.post('/message', optionalAuth, handleChat);

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
