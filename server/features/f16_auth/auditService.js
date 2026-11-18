const AuditLog = require('./models/AuditLog');
const { hashIp } = require('./authUtils');

async function recordAuditLog({
  actorId = null,
  action,
  targetType,
  targetId = null,
  meta = {},
  ip = null
}) {
  try {
    if (!AuditLog.db || AuditLog.db.readyState !== 1) {
      return null;
    }
    const ipHash = ip ? hashIp(ip) : null;
    return await AuditLog.create({
      actorId,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      meta,
      ipHash,
      at: new Date()
    });
  } catch (err) {
    console.error('Failed to create audit log entry:', err.message);
    return null;
  }
}

module.exports = {
  recordAuditLog
};
