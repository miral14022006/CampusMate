const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');

const User = require('./models/User');
const Invite = require('./models/Invite');
const AuditLog = require('./models/AuditLog');
const SessionFamily = require('./models/SessionFamily');

const {
  hashToken,
  generateAccessToken,
  generateRefreshToken
} = require('./authUtils');
const { requireAuth, requireRole } = require('./authMiddleware');
const { recordAuditLog } = require('./auditService');
const { sendInviteEmail } = require('./emailService');
const { recordInBackground } = require('../f17_activity/activityService');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd;

function setRefreshTokenCookie(res, token, rememberMe = false) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'Lax',
    path: '/api/auth',
    maxAge
  });
}

const adminLoginLimiter = process.env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many administrative attempts. Please wait a moment.' }
    })
  : (req, res, next) => next();

const adminLoginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * POST /api/admin/auth/login
 * Strict administrative login (only admin or superadmin roles succeed)
 */
router.post('/login', adminLoginLimiter, async (req, res) => {
  const parseResult = adminLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid login details provided.' });
  }

  const { email, username, password, rememberMe } = parseResult.data;
  const identifier = (email || username || '').toLowerCase().trim();

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }]
    });

    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      await recordAuditLog({
        actorId: user._id,
        action: 'admin_login_locked',
        targetType: 'User',
        targetId: user._id,
        meta: { email: user.email },
        ip: req.ip
      });
      return res.status(429).json({
        error: `Account is temporarily locked due to failed attempts. Try again in ${waitMinutes} minutes.`
      });
    }

    // Generic error for non-existent users, students, or wrong passwords
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      await recordAuditLog({
        actorId: null,
        action: 'admin_login_failure',
        targetType: 'User',
        meta: { identifier, reason: 'user_not_found_or_not_admin' },
        ip: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials or insufficient permissions.' });
    }

    if (user.status !== 'active') {
      await recordAuditLog({
        actorId: user._id,
        action: 'admin_login_inactive',
        targetType: 'User',
        targetId: user._id,
        ip: req.ip
      });
      return res.status(403).json({ error: 'Account is disabled or inactive.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      await recordAuditLog({
        actorId: user._id,
        action: 'admin_login_failure',
        targetType: 'User',
        targetId: user._id,
        meta: { email: user.email, failedLogins: user.failedLogins },
        ip: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials or insufficient permissions.' });
    }

    // Login success
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const familyId = crypto.randomUUID();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    await SessionFamily.create({
      userId: user._id,
      familyId,
      tokenHash,
      userAgent: req.headers['user-agent'] || '',
      ipHash: req.ip,
      expiresAt
    });

    const accessToken = generateAccessToken(user);
    setRefreshTokenCookie(res, rawRefreshToken, rememberMe);

    recordInBackground({
      req,
      userId: user._id,
      actorType: 'admin',
      type: 'login',
      meta: { source: 'admin_console' }
    });

    await recordAuditLog({
      actorId: user._id,
      action: 'admin_login_success',
      targetType: 'User',
      targetId: user._id,
      meta: { email: user.email, role: user.role },
      ip: req.ip
    });

    return res.json({
      accessToken,
      token: accessToken, // Legacy field compatibility for client components
      user: {
        id: user._id,
        username: user.email,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `Login error: ${err.message}` });
  }
});

/**
 * Superadmin Team Management Endpoints:
 */

/**
 * POST /api/admin/team/invites
 * Creates a one-time invitation link (valid 48h)
 */
router.post('/team/invites', requireAuth, requireRole('superadmin'), async (req, res) => {
  const inviteSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address')
  });

  const parseResult = inviteSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues?.[0]?.message || parseResult.error.message || 'Invalid input data';
    return res.status(400).json({ error: msg });
  }

  const { name, email } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if active admin exists with this email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.status === 'active' && (existingUser.role === 'admin' || existingUser.role === 'superadmin')) {
    return res.status(409).json({ error: 'An administrator with this email already exists.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const invite = await Invite.create({
    tokenHash,
    name,
    email: normalizedEmail,
    role: 'admin',
    invitedBy: req.user._id,
    expiresAt
  });

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const inviteUrl = `${appBaseUrl}/invite/${rawToken}`;

  // Optionally email
  await sendInviteEmail({ to: normalizedEmail, name, inviteUrl });

  await recordAuditLog({
    actorId: req.user._id,
    action: 'admin_invited',
    targetType: 'Invite',
    targetId: invite._id,
    meta: { email: normalizedEmail, name },
    ip: req.ip
  });

  return res.status(201).json({
    success: true,
    inviteLink: inviteUrl,
    inviteUrl,
    token: rawToken,
    expiresAt,
    email: normalizedEmail
  });
});

/**
 * GET /api/admin/team/invites
 * Pending (unused, unrevoked, unexpired) admin invitations.
 */
router.get('/team/invites', requireAuth, requireRole('superadmin'), async (req, res) => {
  const invites = await Invite.find({
    used: false,
    revoked: false,
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return res.json({
    invites: invites.map((invite) => ({
      id: String(invite._id),
      name: invite.name,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt
    }))
  });
});

/**
 * DELETE /api/admin/team/invites/:id
 * Revokes a pending invitation link.
 */
router.delete('/team/invites/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const invite = await Invite.findById(req.params.id);
  if (!invite) return res.status(404).json({ error: 'Invitation not found.' });
  invite.revoked = true;
  await invite.save();
  await recordAuditLog({
    actorId: req.user._id,
    action: 'admin_invite_revoked',
    targetType: 'Invite',
    targetId: invite._id,
    meta: { email: invite.email },
    ip: req.ip
  });
  return res.json({ success: true });
});

/**
 * GET /api/admin/team
 * List all admin and superadmin team members
 */
router.get('/team', requireAuth, requireRole('superadmin'), async (req, res) => {
  const admins = await User.find({
    role: { $in: ['admin', 'superadmin'] }
  })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });

  return res.json({
    team: admins.map((a) => ({
      id: a._id,
      name: a.name,
      email: a.email,
      role: a.role,
      status: a.status,
      lastLoginAt: a.lastLoginAt,
      invitedBy: a.invitedBy ? { name: a.invitedBy.name, email: a.invitedBy.email } : null,
      createdAt: a.createdAt
    })),
    admins: admins.map((a) => ({
      id: a._id,
      name: a.name,
      email: a.email,
      role: a.role,
      status: a.status,
      lastLoginAt: a.lastLoginAt,
      invitedBy: a.invitedBy ? { name: a.invitedBy.name, email: a.invitedBy.email } : null,
      createdAt: a.createdAt
    }))
  });
});

/**
 * PATCH /api/admin/team/:id
 * Toggle status (active/disabled)
 */
router.patch('/team/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { status } = req.body;
  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or disabled.' });
  }

  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Team member not found.' });
  }

  // Last superadmin guard
  if (target.role === 'superadmin' && status === 'disabled') {
    const activeSuperadmins = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (activeSuperadmins <= 1) {
      return res.status(400).json({ error: 'Cannot disable the last active superadmin.' });
    }
  }

  target.status = status;
  await target.save();

  if (status === 'disabled') {
    await SessionFamily.updateMany({ userId: target._id }, { isRevoked: true });
  }

  await recordAuditLog({
    actorId: req.user._id,
    action: `admin_status_${status}`,
    targetType: 'User',
    targetId: target._id,
    meta: { email: target.email },
    ip: req.ip
  });

  return res.json({ success: true, user: { id: target._id, status: target.status } });
});

/**
 * POST /api/admin/team/:id/reset-link
 * Generate one-time password reset link
 */
router.post('/team/:id/reset-link', requireAuth, requireRole('superadmin'), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Team member not found.' });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await Invite.create({
    tokenHash,
    name: target.name,
    email: target.email,
    role: target.role,
    invitedBy: req.user._id,
    expiresAt
  });

  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const resetUrl = `${appBaseUrl}/invite/${rawToken}`;

  await recordAuditLog({
    actorId: req.user._id,
    action: 'admin_reset_link_generated',
    targetType: 'User',
    targetId: target._id,
    meta: { email: target.email },
    ip: req.ip
  });

  return res.json({ success: true, resetUrl, token: rawToken, expiresAt });
});

/**
 * DELETE /api/admin/team/:id
 * Delete admin account with last superadmin guard
 */
router.delete('/team/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Team member not found.' });
  }

  if (target.role === 'superadmin') {
    const activeSuperadmins = await User.countDocuments({ role: 'superadmin' });
    if (activeSuperadmins <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last superadmin.' });
    }
  }

  await SessionFamily.deleteMany({ userId: target._id });
  await User.findByIdAndDelete(target._id);

  await recordAuditLog({
    actorId: req.user._id,
    action: 'admin_deleted',
    targetType: 'User',
    targetId: target._id,
    meta: { email: target.email, role: target.role },
    ip: req.ip
  });

  return res.json({ success: true, message: 'Team member deleted successfully.' });
});

/**
 * GET /api/admin/audit
 * Superadmin-only audit log viewer with filtering and pagination
 */
router.get('/audit', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { action, actorId, targetType, from, to, limit = 50, page = 1 } = req.query;

  const query = {};
  if (action) query.action = action;
  if (actorId) query.actorId = actorId;
  if (targetType) query.targetType = targetType;
  if (from || to) {
    query.at = {};
    if (from) query.at.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.at.$lte = end;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ at: -1 })
      .skip(skip)
      .limit(limitNum),
    AuditLog.countDocuments(query)
  ]);

  return res.json({
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
    logs: logs.map((l) => ({
      id: l._id,
      actor: l.actorId ? { id: l.actorId._id, name: l.actorId.name, email: l.actorId.email, role: l.actorId.role } : null,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      meta: l.meta,
      ipHash: l.ipHash,
      at: l.at
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  });
});

module.exports = router;
