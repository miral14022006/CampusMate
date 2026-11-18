const express = require('express');
const { optionalAuth } = require('../f16_auth');
const { record, recordInBackground } = require('./activityService');

const router = express.Router();

/**
 * POST /api/activity/calendar-add
 * Called by every "Add to calendar" control (web, chat and calendar page).
 */
router.post('/calendar-add', optionalAuth, async (req, res) => {
  const { eventId, sourceDocId, category, semester, page } = req.body || {};
  recordInBackground({
    req,
    type: 'calendar_add',
    meta: {
      docId: sourceDocId || null,
      conversationId: req.body?.conversationId || null,
      category: category || null,
      semester: semester || req.user?.semester || null,
      page: page || null,
      source: req.body?.source || 'calendar_button'
    }
  });
  return res.status(202).json({
    success: true,
    eventId: eventId || null,
    recorded: true
  });
});

/**
 * POST /api/activity/page-view
 * Lightweight route-view beacon. Invalid payloads are accepted silently.
 */
router.post('/page-view', optionalAuth, (req, res) => {
  recordInBackground({
    req,
    type: 'page_view',
    meta: { path: req.body?.path || req.headers.referer || null }
  });
  return res.status(202).json({ success: true });
});

/**
 * POST /api/activity/event
 * Small generic beacon for client-side UI events (page views and client-only
 * interactions). Only the allow-listed public types are accepted.
 */
router.post('/event', optionalAuth, async (req, res) => {
  const allowed = new Set(['page_view', 'calendar_add', 'document_view']);
  const { type, meta } = req.body || {};
  if (!allowed.has(type)) {
    return res.status(400).json({ error: 'Unsupported activity type.' });
  }
  await record({ req, type, meta });
  return res.status(202).json({ success: true });
});

module.exports = router;
