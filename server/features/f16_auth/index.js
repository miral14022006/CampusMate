const User = require('./models/User');
const SessionFamily = require('./models/SessionFamily');
const Invite = require('./models/Invite');
const AuditLog = require('./models/AuditLog');
const { requireAuth, requireRole, optionalAuth } = require('./authMiddleware');
const { recordAuditLog } = require('./auditService');
const studentAuthRoutes = require('./studentAuthRoutes');
const adminAuthRoutes = require('./adminAuthRoutes');
const authUtils = require('./authUtils');

module.exports = {
  User,
  SessionFamily,
  Invite,
  AuditLog,
  requireAuth,
  requireRole,
  optionalAuth,
  recordAuditLog,
  studentAuthRoutes,
  adminAuthRoutes,
  ...authUtils
};
