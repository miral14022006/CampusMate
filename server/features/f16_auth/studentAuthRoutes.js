const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');

const User = require('./models/User');
const SessionFamily = require('./models/SessionFamily');
const Invite = require('./models/Invite');
const PersistentConversation = require('../f00_history/conversationModel');
const Conversation = require('../../models/Conversation');

const {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  validatePasswordPolicy,
  isEmailDomainAllowed
} = require('./authUtils');
const { requireAuth } = require('./authMiddleware');
const { recordAuditLog } = require('./auditService');
const { recordInBackground } = require('../f17_activity/activityService');

const router = express.Router();

// Cookie configuration
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

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'Lax',
    path: '/api/auth'
  });
}

// Rate limiters for auth endpoints
const authLimiter = process.env.NODE_ENV === 'production'
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again later.' }
    })
  : (req, res, next) => next();

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  semester: z.number().int().min(1).max(12).optional().nullable(),
  branch: z.string().max(100).optional().nullable()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

// Helper for generic login failure
async function handleFailedLogin(user) {
  if (!user) return;
  user.failedLogins = (user.failedLogins || 0) + 1;
  if (user.failedLogins >= 5) {
    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
  }
  await user.save();
}

/**
 * POST /api/auth/signup
 */
router.post('/signup', authLimiter, async (req, res) => {
  if (process.env.SIGNUP_ENABLED === 'false') {
    return res.status(403).json({ error: 'Public student signup is currently disabled.' });
  }

  const parseResult = signupSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues?.[0]?.message || parseResult.error.message || 'Invalid input data';
    return res.status(400).json({ error: msg });
  }

  const { name, email, password, semester, branch } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Validate allowed email domains (allow pdpu.ac.in, pdeu.ac.in, campus.edu by default)
  const allowedConfig = process.env.ALLOWED_EMAIL_DOMAINS 
    ? `${process.env.ALLOWED_EMAIL_DOMAINS},pdpu.ac.in,pdeu.ac.in` 
    : 'pdpu.ac.in,pdeu.ac.in,campus.edu';
  if (!isEmailDomainAllowed(normalizedEmail, allowedConfig)) {
    return res.status(400).json({ error: 'Email domain is not authorized for student registration.' });
  }

  // Validate password policy
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ error: passwordCheck.error });
  }

  try {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'student',
      status: 'active',
      semester: semester || null,
      branch: branch || null,
      emailVerified: false
    });

    // Create session family & tokens
    const familyId = crypto.randomUUID();
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await SessionFamily.create({
      userId: user._id,
      familyId,
      tokenHash,
      userAgent: req.headers['user-agent'] || '',
      ipHash: req.ip,
      expiresAt
    });

    const accessToken = generateAccessToken(user);
    setRefreshTokenCookie(res, rawRefreshToken, false);

    recordInBackground({
      req,
      userId: user._id,
      actorType: 'student',
      type: 'signup',
      meta: { semester: user.semester, branch: user.branch }
    });
    recordInBackground({
      req,
      userId: user._id,
      actorType: 'student',
      type: 'login',
      meta: { semester: user.semester, branch: user.branch }
    });

    await recordAuditLog({
      actorId: String(user._id),
      action: 'student_signup',
      targetType: 'User',
      targetId: String(user._id),
      meta: { email: user.email, name: user.name, branch: user.branch, semester: user.semester },
      req
    });

    return res.status(201).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester,
        branch: user.branch
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `Registration error: ${err.message}` });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid login details provided.' });
  }

  const { email, password, rememberMe } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });

    // Account locked check
    if (user && user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({
        error: `Account is temporarily locked due to too many failed attempts. Try again in ${waitMinutes} minutes.`
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is disabled or inactive.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      await handleFailedLogin(user, req);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Reset failed logins & update lastLoginAt
    user.failedLogins = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    // Create session family & tokens
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
      actorType: user.role === 'admin' || user.role === 'superadmin' ? 'admin' : 'student',
      type: 'login',
      meta: { semester: user.semester, branch: user.branch }
    });

    if (user.role === 'student') {
      await recordAuditLog({
        actorId: String(user._id),
        action: 'student_login',
        targetType: 'User',
        targetId: String(user._id),
        meta: { email: user.email, name: user.name, branch: user.branch },
        req
      });
    }

    return res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester,
        branch: user.branch,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `Login error: ${err.message}` });
  }
});

/**
 * POST /api/auth/refresh
 * Rotating refresh token logic with reuse detection
 */
router.post('/refresh', async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (!rawRefreshToken) {
    return res.status(401).json({ error: 'Refresh token missing.' });
  }

  const tokenHash = hashToken(rawRefreshToken);

  try {
    const session = await SessionFamily.findOne({ tokenHash });

    if (!session) {
      // Possible reuse attempt or token tampered!
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Invalid session token.' });
    }

    // Reuse detection: If token was already revoked, someone is reusing an old token! Revoke the entire family!
    if (session.isRevoked || session.expiresAt < new Date()) {
      await SessionFamily.updateMany({ familyId: session.familyId }, { isRevoked: true });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Session compromised or expired. Please sign in again.' });
    }

    const user = await User.findById(session.userId);
    if (!user || user.status !== 'active') {
      await SessionFamily.updateMany({ familyId: session.familyId }, { isRevoked: true });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'User account invalid or inactive.' });
    }

    // Mark current session token revoked
    session.isRevoked = true;
    await session.save();

    // Rotate: Issue new refresh token within the same family
    const nextRawRefreshToken = generateRefreshToken();
    const nextTokenHash = hashToken(nextRawRefreshToken);
    const expiresAt = session.expiresAt; // Keep original expiry

    await SessionFamily.create({
      userId: user._id,
      familyId: session.familyId,
      tokenHash: nextTokenHash,
      userAgent: req.headers['user-agent'] || '',
      ipHash: req.ip,
      expiresAt
    });

    const accessToken = generateAccessToken(user);
    setRefreshTokenCookie(res, nextRawRefreshToken, (expiresAt.getTime() - Date.now()) > 2 * 24 * 60 * 60 * 1000);

    return res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `Refresh error: ${err.message}` });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await SessionFamily.findOne({ tokenHash }).lean();
    if (session?.userId) {
      recordInBackground({
        req,
        userId: session.userId,
        actorType: 'student',
        type: 'logout'
      });
    }
    await SessionFamily.updateMany({ tokenHash }, { isRevoked: true });
  }
  clearRefreshTokenCookie(res);
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /api/auth/logout-all
 */
router.post('/logout-all', requireAuth, async (req, res) => {
  await SessionFamily.updateMany({ userId: req.user._id }, { isRevoked: true });
  clearRefreshTokenCookie(res);
  recordInBackground({ req, type: 'logout', meta: { source: 'logout_all' } });
  return res.json({ success: true, message: 'Logged out from all active devices.' });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      semester: req.user.semester,
      branch: req.user.branch,
      emailVerified: req.user.emailVerified,
      mustChangePassword: req.user.mustChangePassword,
      lastLoginAt: req.user.lastLoginAt,
      createdAt: req.user.createdAt
    }
  });
});

/**
 * PATCH /api/auth/me
 */
router.patch('/me', requireAuth, async (req, res) => {
  const patchSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    semester: z.number().int().min(1).max(12).optional().nullable(),
    branch: z.string().max(100).optional().nullable()
  });

  const parseResult = patchSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues?.[0]?.message || parseResult.error.message || 'Invalid input data';
    return res.status(400).json({ error: msg });
  }

  const { name, semester, branch } = parseResult.data;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (name !== undefined) user.name = name;
  if (semester !== undefined) user.semester = semester;
  if (branch !== undefined) user.branch = branch;

  await user.save();

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      semester: user.semester,
      branch: user.branch
    }
  });
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    return res.status(400).json({ error: policy.error });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.mustChangePassword = false;
  await user.save();

  // Invalidate other sessions
  await SessionFamily.updateMany({ userId: user._id }, { isRevoked: true });

  await recordAuditLog({
    actorId: user._id,
    action: 'password_change',
    targetType: 'User',
    targetId: user._id,
    ip: req.ip
  });

  return res.json({ success: true, message: 'Password changed successfully.' });
});

/**
 * GET /api/auth/sessions
 */
router.get('/sessions', requireAuth, async (req, res) => {
  const sessions = await SessionFamily.find({
    userId: req.user._id,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  return res.json({
    sessions: sessions.map((s) => ({
      id: s._id,
      familyId: s.familyId,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt
    }))
  });
});

/**
 * POST /api/auth/sessions/sign-out-others
 * Revokes every session family except the one used by the current browser.
 */
router.post('/sessions/sign-out-others', requireAuth, async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  const tokenHash = rawRefreshToken ? hashToken(rawRefreshToken) : null;
  const current = tokenHash
    ? await SessionFamily.findOne({ tokenHash, userId: req.user._id }).lean()
    : null;

  const filter = { userId: req.user._id, isRevoked: false };
  if (current?.familyId) filter.familyId = { $ne: current.familyId };
  const result = await SessionFamily.updateMany(filter, { isRevoked: true });
  return res.json({
    success: true,
    revoked: result.modifiedCount || 0,
    message: 'Other devices have been signed out.'
  });
});

/**
 * DELETE /api/auth/sessions/:id
 */
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  const session = await SessionFamily.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  await SessionFamily.updateMany({ familyId: session.familyId }, { isRevoked: true });
  return res.json({ success: true, message: 'Session revoked.' });
});

/**
 * DELETE /api/auth/me (delete account)
 */
router.delete('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Prevent deleting the last superadmin
  if (user.role === 'superadmin') {
    const superadminCount = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (superadminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last active superadmin account.' });
    }
  }

  // Detach chats and anonymize activity
  await PersistentConversation.updateMany({ userId: user._id.toString() }, { $unset: { userId: '' } });
  await Conversation.updateMany({ userId: user._id.toString() }, { userId: 'guest_anonymized' });
  await SessionFamily.deleteMany({ userId: user._id });

  await recordAuditLog({
    actorId: user._id,
    action: 'account_deletion',
    targetType: 'User',
    targetId: user._id,
    meta: { email: user.email },
    ip: req.ip
  });

  await User.findByIdAndDelete(user._id);
  clearRefreshTokenCookie(res);

  return res.json({ success: true, message: 'Account deleted and conversations detached.' });
});

/**
 * POST /api/auth/claim-guest-history
 * Moves guest conversations onto the authenticated user
 */
router.post('/claim-guest-history', requireAuth, async (req, res) => {
  const clientId = req.headers['x-client-id'] || req.body.clientId;
  if (!clientId) {
    return res.status(400).json({ error: 'Client ID required to claim guest history.' });
  }

  try {
    const updateResult = await PersistentConversation.updateMany(
      { clientId, userId: { $in: [null, undefined, ''] } },
      { $set: { userId: req.user._id.toString() } }
    );

    return res.json({
      success: true,
      claimedCount: updateResult.modifiedCount || updateResult.nModified || 0
    });
  } catch (err) {
    return res.status(500).json({ error: `Claim error: ${err.message}` });
  }
});

/**
 * GET /api/auth/invite/:token
 * Validates an invitation without consuming it.
 */
router.get('/invite/:token', async (req, res) => {
  const tokenHash = hashToken(req.params.token);
  const invite = await Invite.findOne({ tokenHash }).lean();
  if (!invite) {
    return res.status(404).json({ status: 'invalid', error: 'This invitation link is not valid.' });
  }
  if (invite.used) {
    return res.status(410).json({ status: 'used', error: 'This invitation has already been used.' });
  }
  if (invite.revoked) {
    return res.status(410).json({ status: 'revoked', error: 'This invitation has been revoked.' });
  }
  if (invite.expiresAt < new Date()) {
    return res.status(410).json({ status: 'expired', error: 'This invitation has expired.' });
  }
  return res.json({
    status: 'valid',
    invite: {
      name: invite.name,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt
    }
  });
});

/**
 * POST /api/auth/invite/accept
 */
router.post('/invite/accept', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Invite token and password are required.' });
  }

  const tokenHash = hashToken(token);
  const invite = await Invite.findOne({ tokenHash });

  if (!invite || invite.used || invite.revoked || invite.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invite link is invalid, expired, or has already been used.' });
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    return res.status(400).json({ error: policy.error });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    let user = await User.findOne({ email: invite.email });

    if (user) {
      user.name = invite.name;
      user.role = invite.role;
      user.status = 'active';
      user.passwordHash = passwordHash;
      user.invitedBy = invite.invitedBy;
      user.mustChangePassword = false;
      await user.save();
    } else {
      user = await User.create({
        name: invite.name,
        email: invite.email,
        passwordHash,
        role: invite.role,
        status: 'active',
        invitedBy: invite.invitedBy,
        mustChangePassword: false,
        emailVerified: true
      });
    }

    invite.used = true;
    await invite.save();

    await recordAuditLog({
      actorId: user._id,
      action: 'invite_accepted',
      targetType: 'User',
      targetId: user._id,
      meta: { email: user.email, role: user.role },
      ip: req.ip
    });

    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateRefreshToken();
    const sessionTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await SessionFamily.create({
      userId: user._id,
      familyId: crypto.randomUUID(),
      tokenHash: sessionTokenHash,
      userAgent: req.headers['user-agent'] || '',
      ipHash: req.ip,
      expiresAt
    });

    setRefreshTokenCookie(res, rawRefreshToken, false);

    recordInBackground({
      req,
      userId: user._id,
      actorType: 'admin',
      type: 'login',
      meta: { source: 'invite_accept' }
    });

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `Invite acceptance error: ${err.message}` });
  }
});

/**
 * GET /api/auth/config
 * Public feature discovery used by the auth screens. No secrets.
 */
router.get('/config', (req, res) => {
  return res.json({
    guestMode: process.env.GUEST_MODE !== 'false',
    signupEnabled: process.env.SIGNUP_ENABLED !== 'false',
    emailResetEnabled: process.env.EMAIL_RESET_ENABLED === 'true',
    inviteEnabled: true,
    allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'pdeu.ac.in,campus.edu')
      .split(',')
      .map((domain) => domain.trim())
      .filter(Boolean),
    passwordMinLength: 8
  });
});

module.exports = router;
