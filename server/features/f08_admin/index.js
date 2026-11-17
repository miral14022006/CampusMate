const { generateToken, verifyToken, requireAdminAuth, requireRole } = require('./auth');
const { upload, calculateChecksum, UPLOAD_DIR } = require('./uploadMiddleware');
const documentAdminRouter = require('./documentController');

module.exports = {
  generateToken,
  verifyToken,
  requireAdminAuth,
  requireRole,
  upload,
  calculateChecksum,
  UPLOAD_DIR,
  documentAdminRouter
};

