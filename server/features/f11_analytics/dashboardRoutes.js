const express = require('express');
const { requireAuth, requireRole } = require('../f16_auth');
const { router: dashboardController } = require('./dashboardController');

const router = express.Router();

// Every dashboard route requires an administrator. Students and guests are blocked
// before any data is read, regardless of query parameters.
router.use(requireAuth, requireRole('admin', 'superadmin'));

router.use('/', dashboardController);

module.exports = router;
