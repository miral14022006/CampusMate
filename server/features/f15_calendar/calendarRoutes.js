const express = require('express');
const router = express.Router();
const features = require('../../config/features');
const { requireAdminAuth } = require('../f08_admin/auth');
const {
  getPublicEvents,
  getEventIcs,
  exportSelectedIcs,
  getSubscribableFeedIcs,
  listAdminPendingEvents,
  approveEvent,
  rejectEvent,
  editEvent,
  createManualEvent
} = require('./calendarController');

const {
  getAuthUrl,
  handleOAuthCallback,
  getOAuthStatus,
  disconnectOAuth,
  insertEventDirect
} = require('./calendarOAuthController');

// Public endpoints
router.get('/events', getPublicEvents);
router.get('/events/:id.ics', getEventIcs);
router.post('/ics', exportSelectedIcs);
router.get('/feed.ics', getSubscribableFeedIcs);

// Optional Google Calendar OAuth Endpoints (behind feature flag calendar_google_oauth)
router.use('/oauth', (req, res, next) => {
  if (!features.calendar_google_oauth && process.env.FEATURE_CALENDAR_GOOGLE_OAUTH !== 'true') {
    return res.status(403).json({
      error: 'Google Calendar OAuth integration is disabled by feature flag.',
      code: 'FEATURE_DISABLED'
    });
  }
  next();
});

router.get('/oauth/auth-url', getAuthUrl);
router.get('/oauth/callback', handleOAuthCallback);
router.get('/oauth/status', getOAuthStatus);
router.post('/oauth/disconnect', disconnectOAuth);
router.post('/oauth/insert', insertEventDirect);

// Admin endpoints (JWT authenticated)
router.get('/admin/events', requireAdminAuth, listAdminPendingEvents);
router.post('/admin/events', requireAdminAuth, createManualEvent);
router.put('/admin/events/:id/approve', requireAdminAuth, approveEvent);
router.put('/admin/events/:id/reject', requireAdminAuth, rejectEvent);
router.put('/admin/events/:id', requireAdminAuth, editEvent);

module.exports = router;
