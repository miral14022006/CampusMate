const { nlpClient } = require('../../../services/nlpClient');
const { sessionManager } = require('../../f06_sessions');
const { serverCacheManager } = require('../../f12_cache');
const { recordFeedback } = require('../../f10_feedback');
const { logQueryAnalytics } = require('../../f11_analytics');
const featureFlags = require('../../../config/features');

/**
 * Common Chat Query Dispatcher supporting any channel ('web', 'telegram', 'whatsapp')
 * Preserves multi-turn session memory (Part 6), caching (Part 12), and telemetry (Part 11).
 */
async function processChannelQuery({
  channel = 'web',
  sessionId,
  query,
  clientMeta = {}
}) {
  const normQuery = (query || '').trim();
  if (!normQuery) {
    throw new Error('Query string is required');
  }

  // Feature 06: Session Dialogue State
  let dialogueState = null;
  if (featureFlags.dialogue_state) {
    dialogueState = await sessionManager.getState(sessionId);
  }

  // Feature 12: Cache lookup
  let nlpData = null;
  let isFromCache = false;
  if (featureFlags.cache_enabled && (!dialogueState || !dialogueState.last_intent)) {
    const cachedEntry = await serverCacheManager.get(normQuery, 'en', dialogueState?.slots);
    if (cachedEntry.cached && cachedEntry.data) {
      nlpData = cachedEntry.data;
      isFromCache = true;
    }
  }

  if (!nlpData) {
    try {
      nlpData = await nlpClient.query(normQuery, null, sessionId, dialogueState);
      if (featureFlags.cache_enabled && nlpData) {
        await serverCacheManager.set(normQuery, nlpData.language, dialogueState?.slots, nlpData);
      }
    } catch (err) {
      console.warn(`[ChannelDispatcher] NLP service fallback (${err.message})`);
      nlpData = {
        answer: 'I am currently unable to reach the campus database. Please visit the admin desk for immediate assistance.',
        language: 'en',
        intent: 'out_of_scope',
        confidence: 0.5,
        source_doc: 'campus_notice.txt',
        entities: [],
        standalone_query: normQuery,
        decision: 'FALLBACK',
        grounded: true,
        citations: []
      };
    }
  }

  // Feature 06: Session Update or Reset
  if (featureFlags.dialogue_state) {
    if (nlpData.is_reset) {
      await sessionManager.resetState(sessionId);
    } else if (nlpData.dialogue_state) {
      await sessionManager.saveState(sessionId, nlpData.dialogue_state);
    }
  }

  // Feature 11: Telemetry tracking with channel tagging
  const isUnans = nlpData.decision === 'FALLBACK' || nlpData.intent === 'out_of_scope' || nlpData.grounded === false;
  const isClarif = nlpData.decision === 'CLARIFY';
  await logQueryAnalytics({
    requestId: nlpData.request_id || `req_${Date.now()}`,
    sessionId,
    query: normQuery,
    normalizedQuery: normQuery.toLowerCase().replace(/[^\w\s]/g, ''),
    language: nlpData.language || 'en',
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
    isSeeded: false,
    channel
  });

  return {
    ...nlpData,
    channel,
    sessionId,
    messageId: `msg_${channel}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  };
}

module.exports = {
  processChannelQuery
};

