const express = require('express');
const { nlpClient } = require('../services/nlpClient');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const featureFlags = require('../config/features');
const { sessionManager } = require('../features/f06_sessions');
const { serverCacheManager } = require('../features/f12_cache');
const { logImplicitFailureIfNeeded } = require('../features/f10_feedback');
const { logQueryAnalytics } = require('../features/f11_analytics');
const { PersistentConversation } = require('../features/f00_history');
const { optionalAuth } = require('../features/f16_auth');
const { recordInBackground } = require('../features/f17_activity/activityService');

const router = express.Router();

/**
 * POST /api/chat & POST /api/chat/message
 * Primary chat endpoint: queries production NLP service client, caches/saves conversation, and returns full state.
 */
const handleChat = async (req, res) => {
  const { query, sessionId = `session_${Date.now()}` } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  try {
    let nlpData = null;

    // Feature 06: Retrieve hot dialogue state from Redis / in-memory session manager
    let dialogueState = null;
    if (featureFlags.dialogue_state) {
      dialogueState = await sessionManager.getState(sessionId);
    }

    // Feature 12: Check Redis server-side cache for stateless answerable queries
    let isFromCache = false;
    if (featureFlags.cache_enabled && (!dialogueState || !dialogueState.last_intent)) {
      const cachedEntry = await serverCacheManager.get(query.trim(), 'en', dialogueState?.slots);
      if (cachedEntry.cached && cachedEntry.data) {
        nlpData = cachedEntry.data;
        isFromCache = true;
      }
    }

    if (!nlpData) {
      try {
        // Use production nlpClient with retry, timeout, session ID & dialogue state
        nlpData = await nlpClient.query(query.trim(), null, sessionId, dialogueState);

        // Feature 12: Cache valid answerable query result
        if (featureFlags.cache_enabled && nlpData) {
          await serverCacheManager.set(query.trim(), nlpData.language, dialogueState?.slots, nlpData);
        }
      } catch (nlpErr) {
        console.warn(`[Server] NLP service unavailable (${nlpErr.message}), returning graceful baseline fallback.`);
        nlpData = {
          answer: 'Thank you for reaching out. The campus information service is currently operating in offline mode. Please consult the admin desk for immediate assistance.',
          language: 'en',
          intent: 'out_of_scope',
          confidence: 0.5,
          source_doc: 'offline_notice.txt',
          entities: [],
          standalone_query: query.trim(),
          is_follow_up: false,
          is_reset: false
        };
      }
    }

    // Store latency metadata for middleware
    res.locals.latencyData = {
      requestId: nlpData.request_id || `req_${Date.now()}`,
      language: nlpData.language,
      intent: nlpData.intent,
      cached: isFromCache,
      nlpExecutionTimeMs: nlpData.execution_time_ms || 0,
      stageLatencies: nlpData.analysis?.stage_latencies_ms || {}
    };

    // Feature 06: Save updated dialogue state or reset if requested
    if (featureFlags.dialogue_state) {
      if (nlpData.is_reset) {
        await sessionManager.resetState(sessionId);
      } else if (nlpData.dialogue_state) {
        await sessionManager.saveState(sessionId, nlpData.dialogue_state);
      }
    }

    let createdMessageId = `msg_${Date.now()}`;
    // Persist messages if MongoDB is available
    try {
      await Message.create({
        sessionId,
        sender: 'user',
        text: query,
        language: nlpData.language,
        channel: 'web'
      });

      const assistantMsg = await Message.create({
        sessionId,
        sender: 'assistant',
        text: nlpData.answer,
        language: nlpData.language,
        channel: 'web',
        intent: nlpData.intent,
        confidence: nlpData.confidence,
        sourceDoc: nlpData.source_doc,
        entities: nlpData.entities || [],
        calendarEvents: nlpData.calendar_events || []
      });
      createdMessageId = String(assistantMsg._id);

      // Feature 10: Automatic implicit failure logging
      await logImplicitFailureIfNeeded({
        messageId: createdMessageId,
        sessionId,
        query: query.trim(),
        nlpData
      });

      // Feature 11: Real-time query analytics tracking
      const isUnans = nlpData.decision === 'FALLBACK' || nlpData.intent === 'out_of_scope' || nlpData.grounded === false;
      const isClarif = nlpData.decision === 'CLARIFY';
      await logQueryAnalytics({
        requestId: nlpData.request_id || `req_${Date.now()}`,
        sessionId,
        query: query.trim(),
        normalizedQuery: query.trim().toLowerCase().replace(/[^\w\s]/g, ''),
        language: nlpData.language || 'en',
        channel: 'web',
        intent: nlpData.intent || 'unknown',
        confidence: nlpData.confidence || 0.0,
        sourceDoc: nlpData.source_doc || null,
        decision: nlpData.decision || 'ANSWER',
        isUnanswered: isUnans,
        isClarification: isClarif,
        cached: isFromCache,
        totalLatencyMs: nlpData.execution_time_ms || 0,
        nlpExecutionTimeMs: nlpData.execution_time_ms || 0,
        stageLatencies: nlpData.analysis?.stage_latencies_ms || {},
        isSeeded: false
      });

      await Conversation.findOneAndUpdate(
        { sessionId },
        {
          $inc: { messageCount: 2 },
          $set: { dominantLanguage: nlpData.language, channel: 'web', lastActivity: new Date() }
        },
        { upsert: true, new: true }
      );

      // Feature 00: Persistent conversation history record update & auto-title
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
      // In offline/transient mode, also check implicit failure logging to memory store
      await logImplicitFailureIfNeeded({
        messageId: createdMessageId,
        sessionId,
        query: query.trim(),
        nlpData
      });
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
      grounded: nlpData.grounded !== undefined ? nlpData.grounded : true,
      generation_mode: nlpData.generation_mode || "rag",
      hallucination_score: nlpData.hallucination_score || 0.0,
      decision: nlpData.decision || "ANSWER",
      clarification_question: nlpData.clarification_question || null,
      quick_replies: nlpData.quick_replies || [],
      contact_info: nlpData.contact_info || null,
      standalone_query: nlpData.standalone_query || query,
      is_follow_up: Boolean(nlpData.is_follow_up),
      is_reset: Boolean(nlpData.is_reset),
      dialogue_state: nlpData.dialogue_state || null,
      execution_time_ms: nlpData.execution_time_ms
    });
  } catch (error) {
    console.error(`[Server Error] /api/chat: ${error.message}`);
    return res.status(500).json({ error: 'Internal gateway error.' });
  }
};

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
  } catch (err) {
    return res.status(200).json({ sessionId, messages: [] });
  }
});

module.exports = router;
