const { recordFeedback } = require('./feedbackController');

/**
 * Checks if a response represents an implicit failure:
 * - Low confidence (< 0.50)
 * - Clarification triggered (ambiguous)
 * - Fallback / out_of_scope
 * - RAG NO_ANSWER / IDK
 */
function isImplicitFailure(nlpData) {
  if (!nlpData) return false;

  const confidence = Number(nlpData.confidence || 0);
  const decision = String(nlpData.decision || 'ANSWER').toUpperCase();
  const intent = String(nlpData.intent || '').toLowerCase();
  const answer = String(nlpData.answer || '').toLowerCase();

  if (confidence > 0 && confidence < 0.50) {
    return { isFailure: true, reason: 'implicit_low_confidence' };
  }

  if (decision === 'CLARIFY' || decision === 'FALLBACK') {
    return { isFailure: true, reason: 'implicit_fallback' };
  }

  if (intent === 'out_of_scope') {
    return { isFailure: true, reason: 'implicit_fallback' };
  }

  if (
    answer.includes('i do not have sufficient information') ||
    answer.includes('no_answer') ||
    answer.includes('offline mode') ||
    nlpData.grounded === false
  ) {
    return { isFailure: true, reason: 'implicit_idk' };
  }

  return { isFailure: false, reason: null };
}

/**
 * Automatically logs implicit failures into the feedback collection with pending status
 */
async function logImplicitFailureIfNeeded({ messageId, sessionId, query, nlpData }) {
  try {
    const check = isImplicitFailure(nlpData);
    if (!check.isFailure) return null;

    const snapshot = {
      language: nlpData.language || 'en',
      intent: nlpData.intent || 'unknown',
      confidence: nlpData.confidence || 0.0,
      retrievedChunkIds: (nlpData.citations || []).map(c => c.chunk_id || c.id || String(c.citation_id)),
      retrievedDocs: nlpData.source_doc ? [nlpData.source_doc] : [],
      answer: nlpData.answer || '',
      mode: nlpData.generation_mode || 'rag',
      decision: nlpData.decision || 'ANSWER'
    };

    return await recordFeedback({
      messageId: messageId || `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: sessionId || 'session_auto',
      query: query.trim(),
      rating: 'implicit_failure',
      reason: check.reason,
      comment: `Auto-flagged failure (${check.reason}): confidence=${nlpData.confidence}, decision=${nlpData.decision}`,
      pipelineSnapshot: snapshot,
      reviewStatus: 'pending'
    });
  } catch (err) {
    console.warn(`[Implicit Failure Logger] Failed to record: ${err.message}`);
    return null;
  }
}

module.exports = {
  isImplicitFailure,
  logImplicitFailureIfNeeded
};

