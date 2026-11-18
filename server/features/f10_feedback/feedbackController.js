const express = require('express');
const router = express.Router();
const Feedback = require('../../models/Feedback');
const { requireAdminAuth } = require('../f08_admin');
const { recordAuditLog } = require('../f16_auth/auditService');
const { optionalAuth } = require('../f16_auth');
const { recordInBackground } = require('../f17_activity');

// In-memory fallback repository when MongoDB is in transient/offline mode
const memoryFeedbackStore = [];

/**
 * Helper to record feedback in MongoDB or memory
 */
async function recordFeedback(data) {
  try {
    if (Feedback.db && Feedback.db.readyState === 1) {
      return await Feedback.create(data);
    }
  } catch (err) {
    console.warn(`[Feedback] MongoDB insert fallback to memory: ${err.message}`);
  }
  const item = {
    _id: `mem_fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    createdAt: new Date()
  };
  memoryFeedbackStore.push(item);
  return item;
}

/**
 * POST /api/feedback
 * Records explicit user rating (thumbs up / thumbs down + reasons)
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      messageId,
      sessionId,
      query,
      rating,
      reason,
      comment,
      correctIntent,
      correctDoc,
      pipelineSnapshot
    } = req.body;

    if (!messageId || !rating || !query) {
      return res.status(400).json({ error: 'messageId, rating, and query are required fields.' });
    }

    if (!['up', 'down'].includes(rating)) {
      return res.status(400).json({ error: 'rating must be "up" or "down".' });
    }

    const feedbackDoc = await recordFeedback({
      messageId,
      sessionId: sessionId || 'unknown_session',
      query,
      rating,
      reason: reason || null,
      comment: comment || '',
      correctIntent: correctIntent || null,
      correctDoc: correctDoc || null,
      pipelineSnapshot: pipelineSnapshot || {},
      reviewStatus: rating === 'down' ? 'pending' : 'approved'
    });

    recordInBackground({
      req,
      type: 'feedback',
      meta: {
        messageId,
        conversationId: sessionId || null,
        rating,
        intent: pipelineSnapshot?.intent || null,
        language: pipelineSnapshot?.language || null
      }
    });

    return res.status(201).json({
      status: 'success',
      feedbackId: feedbackDoc._id,
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    console.error(`[Feedback API Error]: ${error.message}`);
    return res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/admin/feedback/queue
 * Admin review queue: fetches failure candidates & negative feedbacks for annotation
 */
router.get('/queue', requireAdminAuth, async (req, res) => {
  try {
    const { status = 'all', rating } = req.query;

    if (Feedback.db && Feedback.db.readyState === 1) {
      const queryFilter = {};
      if (status && status !== 'all') queryFilter.reviewStatus = status;
      if (rating) queryFilter.rating = rating;

      const items = await Feedback.find(queryFilter).sort({ createdAt: -1 }).limit(200).lean();
      return res.json({ queue: items });
    }

    // Memory fallback
    let items = memoryFeedbackStore;
    if (status && status !== 'all') items = items.filter(it => it.reviewStatus === status);
    if (rating) items = items.filter(it => it.rating === rating);
    return res.json({ queue: items.reverse().slice(0, 200) });
  } catch (error) {
    console.error(`[Feedback Queue Error]: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

/**
 * PATCH /api/admin/feedback/:id/review
 * Admin reviews an item: assigns correct intent / doc, approves or rejects for retraining
 */
router.patch('/:id/review', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { correctIntent, correctDoc, reviewStatus = 'approved' } = req.body;

    if (Feedback.db && Feedback.db.readyState === 1) {
      const updated = await Feedback.findByIdAndUpdate(
        id,
        {
          $set: {
            correctIntent: correctIntent || null,
            correctDoc: correctDoc || null,
            reviewStatus,
            reviewedBy: req.admin?.username || 'admin',
            reviewedAt: new Date()
          }
        },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ error: 'Feedback record not found' });
      }
      return res.json({ status: 'success', item: updated });
    }

    // Memory fallback
    const idx = memoryFeedbackStore.findIndex(it => String(it._id) === String(id));
    if (idx === -1) {
      return res.status(404).json({ error: 'Feedback record not found in memory' });
    }
    memoryFeedbackStore[idx] = {
      ...memoryFeedbackStore[idx],
      correctIntent: correctIntent !== undefined ? correctIntent : memoryFeedbackStore[idx].correctIntent,
      correctDoc: correctDoc !== undefined ? correctDoc : memoryFeedbackStore[idx].correctDoc,
      reviewStatus,
      reviewedBy: req.admin?.username || 'admin',
      reviewedAt: new Date()
    };

    return res.json({ status: 'success', item: memoryFeedbackStore[idx] });
  } catch (error) {
    console.error(`[Feedback Review Error]: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update feedback review' });
  }
});

/**
 * GET /api/admin/feedback/export
 * Dumps all approved retraining records as JSON for retraining pipelines
 */
router.get('/export', requireAdminAuth, async (req, res) => {
  try {
    let approved = [];
    if (Feedback.db && Feedback.db.readyState === 1) {
      approved = await Feedback.find({ reviewStatus: 'approved' }).lean();
    } else {
      approved = memoryFeedbackStore.filter(it => it.reviewStatus === 'approved');
    }

    const exportRows = approved.map(item => ({
      id: item._id,
      query: item.query,
      intent: item.correctIntent || item.pipelineSnapshot?.intent || 'out_of_scope',
      language: item.pipelineSnapshot?.language || 'en',
      rating: item.rating,
      reason: item.reason,
      correctDoc: item.correctDoc || null,
      retrievedChunks: item.pipelineSnapshot?.retrievedChunkIds || [],
      createdAt: item.createdAt
    }));

    await recordAuditLog({
      actorId: req.admin?.id,
      action: 'feedback_export',
      targetType: 'feedback',
      targetId: null,
      meta: { count: exportRows.length },
      req
    });

    return res.json({
      count: exportRows.length,
      data: exportRows
    });
  } catch (error) {
    console.error(`[Feedback Export Error]: ${error.message}`);
    return res.status(500).json({ error: 'Failed to export feedback data' });
  }
});

module.exports = {
  feedbackRouter: router,
  recordFeedback,
  memoryFeedbackStore
};
