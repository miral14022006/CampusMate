const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../../server');
const User = require('../models/User');
const SessionFamily = require('../models/SessionFamily');
const Invite = require('../models/Invite');
const AuditLog = require('../models/AuditLog');
const { generateAccessToken, generateRefreshToken } = require('../authUtils');

// Helper to clean collections if mongo is connected
async function clearCollections() {
  if (User.db && User.db.readyState === 1) {
    await User.deleteMany({ email: /pdeu\.ac\.in/ });
    await SessionFamily.deleteMany({});
    await Invite.deleteMany({});
    await AuditLog.deleteMany({});
  }
}

describe('Feature 16: Authentication & Roles Test Suite', () => {
  let superadminUser;
  let adminUser;
  let studentUser;
  let superadminToken;
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890123456';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890123456';
    process.env.ALLOWED_EMAIL_DOMAINS = 'pdeu.ac.in,campus.edu';
    process.env.SIGNUP_ENABLED = 'true';
    process.env.GUEST_MODE = 'true';

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 }).catch(() => {});
    }

    // Clean test fixture emails
    await clearCollections();

    // Create fixture users
    const salt = await bcrypt.genSalt(12);
    const pwdHash = await bcrypt.hash('CorrectHorseBattery99!', salt);

    if (User.db && User.db.readyState === 1) {
      superadminUser = await User.create({
        name: 'Super Admin',
        email: 'superadmin@pdeu.ac.in',
        passwordHash: pwdHash,
        role: 'superadmin',
        status: 'active'
      });

      adminUser = await User.create({
        name: 'Admin Test',
        email: 'admin@pdeu.ac.in',
        passwordHash: pwdHash,
        role: 'admin',
        status: 'active'
      });

      studentUser = await User.create({
        name: 'Student Test',
        email: 'student@pdeu.ac.in',
        passwordHash: pwdHash,
        role: 'student',
        status: 'active'
      });
    } else {
      superadminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'superadmin@pdeu.ac.in',
        role: 'superadmin',
        name: 'Super Admin'
      };
      adminUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@pdeu.ac.in',
        role: 'admin',
        name: 'Admin Test'
      };
      studentUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'student@pdeu.ac.in',
        role: 'student',
        name: 'Student Test'
      };
    }

    superadminToken = generateAccessToken(superadminUser);
    adminToken = generateAccessToken(adminUser);
    studentToken = generateAccessToken(studentUser);
  }, 20000);

  afterAll(async () => {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Signup & Domain Check & Password Policy', () => {
    it('rejects email domains not in ALLOWED_EMAIL_DOMAINS', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Hacker',
          email: 'hacker@gmail.com',
          password: 'CorrectHorseBattery99!'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/authorized/i);
    });

    it('rejects weak or top-1000 common passwords', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Student',
          email: 'validstudent@pdeu.ac.in',
          password: 'password123'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Password is too common/i);
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Student',
          email: 'validstudent@pdeu.ac.in',
          password: 'short'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('2. Login Lockout & Generic Error Messages', () => {
    it('returns generic error on non-existent user (no user enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@pdeu.ac.in',
          password: 'AnyPassword123!'
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('returns generic error on invalid password (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@pdeu.ac.in',
          password: 'WrongPassword999!'
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password.');
    });

    it('locks account after 5 failed login attempts', async () => {
      const testEmail = 'lockout_test@pdeu.ac.in';
      const salt = await bcrypt.genSalt(12);
      const pwdHash = await bcrypt.hash('SecretPass123!', salt);

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await User.create({
          name: 'Lockout Candidate',
          email: testEmail,
          passwordHash: pwdHash,
          role: 'student',
          status: 'active'
        });

        // 5 wrong attempts
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/auth/login')
            .send({ email: testEmail, password: 'BadPassword123!' });
        }

        // 6th attempt should return 429 Account locked
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'BadPassword123!' });
        expect(res.status).toBe(429);
        expect(res.body.error).toMatch(/temporarily locked/i);
      }
    });
  });

  describe('3. Admin Login & Role Separation', () => {
    it('rejects student attempting to login at /api/admin/auth/login with generic error', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'student@pdeu.ac.in',
          password: 'CorrectHorseBattery99!'
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials or insufficient permissions.');
    });

    it('blocks student token from accessing /api/admin/documents', async () => {
      const res = await request(app)
        .get('/api/admin/documents')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it('blocks regular admin token from accessing superadmin endpoints (e.g. GET /api/admin/team)', async () => {
      const res = await request(app)
        .get('/api/admin/team')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it('allows superadmin token to access /api/admin/team', async () => {
      const res = await request(app)
        .get('/api/admin/team')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.admins).toBeDefined();
    });
  });

  describe('4. Last Superadmin Protection', () => {
    it('blocks deleting the last superadmin', async () => {
      const res = await request(app)
        .delete(`/api/admin/team/${superadminUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot delete the last superadmin/i);
    });

    it('blocks disabling the last superadmin', async () => {
      const res = await request(app)
        .patch(`/api/admin/team/${superadminUser._id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ status: 'disabled' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Cannot disable the last active superadmin/i);
    });
  });

  describe('5. Refresh Token Rotation & Reuse Detection', () => {
    it('rotates refresh token and detects reuse attempts', async () => {
      if (!(mongoose.connection && mongoose.connection.readyState === 1)) {
        return; // requires mongo for full session family check
      }

      // 1. Successful student login to obtain cookies
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@pdeu.ac.in',
          password: 'CorrectHorseBattery99!'
        });
      expect(loginRes.status).toBe(200);

      const rawCookie = loginRes.headers['set-cookie'];
      expect(rawCookie).toBeDefined();
      const refreshCookie = rawCookie.find(c => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();

      // 2. Perform valid refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();

      const newRawCookie = refreshRes.headers['set-cookie'];
      const newRefreshCookie = newRawCookie.find(c => c.startsWith('refreshToken='));

      // 3. Attempt to REUSE the old refresh cookie -> should trigger reuse detection and revoke family!
      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookie]);
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error).toMatch(/compromised|invalid|expired/i);

      // 4. Now the new refresh token should also be revoked because the entire family was invalidated
      const subsequentRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [newRefreshCookie]);
      expect(subsequentRes.status).toBe(401);
    });
  });

  describe('6. Invites One-Time Use and Expiry', () => {
    it('creates an invite and allows one-time acceptance', async () => {
      if (!(mongoose.connection && mongoose.connection.readyState === 1)) {
        return;
      }

      // Create invite as superadmin
      const inviteRes = await request(app)
        .post('/api/admin/team/invites')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          name: 'Invited Admin',
          email: 'invited_admin@pdeu.ac.in',
          role: 'admin'
        });
      expect(inviteRes.status).toBe(201);
      expect(inviteRes.body.inviteLink).toBeDefined();
      const token = inviteRes.body.token;

      // Accept invite
      const acceptRes = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token,
          password: 'AdminPassword99!'
        });
      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);

      // Second attempt with same token must fail (one-time use)
      const reAcceptRes = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token,
          password: 'AnotherPassword99!'
        });
      expect(reAcceptRes.status).toBe(400);
      expect(reAcceptRes.body.error).toMatch(/invalid|expired|already been used/i);
    });
  });

  describe('7. Audit Log Recording and Superadmin Query Endpoint', () => {
    it('superadmin can query audit logs with pagination and filters', async () => {
      const res = await request(app)
        .get('/api/admin/audit?limit=10')
        .set('Authorization', `Bearer ${superadminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.page).toBe(1);
    });

    it('regular admin is forbidden from querying audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('8. Guest Chat History Claiming', () => {
    it('claims guest conversations by clientId for authenticated user', async () => {
      const res = await request(app)
        .post('/api/auth/claim-guest-history')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ clientId: 'guest-client-session-123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.claimedCount).toBe('number');
    });

    it('rejects claim request if unauthenticated', async () => {
      const res = await request(app)
        .post('/api/auth/claim-guest-history')
        .send({ clientId: 'guest-client-session-123' });
      expect(res.status).toBe(401);
    });
  });
});
