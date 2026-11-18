# FEATURE 16: Authentication and Roles

## Overview
Feature 16 (`f16_auth`) introduces comprehensive user authentication, role-based access control (RBAC), and session security for CampusMate.

The feature establishes three distinct roles:
1. **student**: Can signup with allowed institutional domains (`@pdeu.ac.in`), login, manage their profile, sessions, change passwords, claim guest conversations, and delete their account. Cannot access administrative endpoints.
2. **admin**: Can manage documents, feedback review queues, analytics, calendar events, and view cache telemetry. Authenticated via `/api/admin/auth/login` (legacy `/api/admin/login` preserved during migration).
3. **superadmin**: Exactly one active superadmin account. Can invite new admins via time-limited one-time tokens, enable/disable admins, trigger password resets, and inspect comprehensive audit logs. Protected against deletion or demotion.

Feature flag: `"auth": true` in `server/config/features.js`.

---

## Architecture & File Structure
```
server/features/f16_auth/
├── index.js                  # Barrel export for models, middleware, utils, and routers
├── authMiddleware.js         # requireAuth, requireRole, optionalAuth
├── authUtils.js              # Token generation, IP hashing, common password check, domain whitelist
├── auditService.js           # recordAuditLog helper
├── commonPasswords.js        # Reject list of top 1,000 common passwords
├── emailService.js           # Nodemailer transport for admin invites (gracefully skips if SMTP unset)
├── studentAuthRoutes.js      # /api/auth/* endpoints (signup, login, refresh, sessions, me, claim)
├── adminAuthRoutes.js        # /api/admin/auth/login, /api/admin/team/*, /api/admin/audit
├── models/
│   ├── User.js               # Unified user schema (student, admin, superadmin)
│   ├── SessionFamily.js      # Rotating refresh tokens with reuse detection & family revocation
│   ├── Invite.js             # One-time 48h invitation tokens (stored hashed)
│   └── AuditLog.js           # Security and admin activity logs (actorId, action, target, ipHash)
└── tests/
    └── auth.test.js          # Unit and integration test suite
```

### Supporting Scripts
- `scripts/migrateAdminUsers.js`: Copies existing `AdminUser` documents into `User` with role `"admin"`. Original `AdminUser` documents are preserved.
- `scripts/seedSuperadmin.js`: Creates or verifies the initial superadmin from `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`. Enforces password complexity, prevents duplicate superadmins, and flags `mustChangePassword`.

---

## Token & Session Model
1. **Access Token**:
   - Short-lived JWT (15 minutes).
   - Delivered in response JSON body for in-memory client storage (`Authorization: Bearer <token>`).
2. **Refresh Token**:
   - Transported via `httpOnly`, `SameSite=Lax` cookie (named `refreshToken`).
   - `Secure` flag enabled in production (`COOKIE_SECURE=true` or `NODE_ENV=production`).
   - Lifetime: 1 day standard, 30 days if `rememberMe: true`.
   - Stored securely as SHA-256 hash in `SessionFamily`.
   - Rotating tokens on each refresh. If an old/compromised refresh token is reused, the entire session family is automatically revoked.

---

## Protection & Security Mechanisms
- **Rate Limiting**: `express-rate-limit` configured per IP and email on authentication routes.
- **Account Lockout**: 5 consecutive failed login attempts trigger a 15-minute lock (`lockedUntil`).
- **Generic Errors**: Responses intentionally avoid user enumeration (returns `Invalid email or password.` regardless of whether the email or password was incorrect).
- **Password Policy**: Minimum 8 characters; checked against the top 1,000 common passwords dictionary.
- **Email Whitelist**: New student signups require email domain match against `ALLOWED_EMAIL_DOMAINS` (default: `pdeu.ac.in,campus.edu`).

---

## Complete Route Table

| Method | Endpoint | Auth / Guard | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | Public (domain checked) | Student registration |
| **POST** | `/api/auth/login` | Public (rate limited) | Student login (issues JWT + refresh cookie) |
| **POST** | `/api/auth/refresh` | Cookie (`refreshToken`) | Rotates refresh token & issues new access token |
| **POST** | `/api/auth/logout` | Cookie (`refreshToken`) | Revokes current session token |
| **POST** | `/api/auth/logout-all`| `requireAuth` | Revokes all active session families for user |
| **GET** | `/api/auth/me` | `requireAuth` | Current user profile |
| **PATCH**| `/api/auth/me` | `requireAuth` | Update name, semester, branch |
| **POST** | `/api/auth/change-password` | `requireAuth` | Change password with current password verification |
| **GET** | `/api/auth/sessions` | `requireAuth` | List active device sessions |
| **DELETE**| `/api/auth/sessions/:familyId` | `requireAuth` | Revoke specific session device |
| **DELETE**| `/api/auth/me` | `requireAuth` | Delete account (detaches conversations & anonymizes) |
| **POST** | `/api/auth/claim-guest-history` | `requireAuth` | Reassigns anonymous client conversations to logged-in user |
| **POST** | `/api/auth/invite/accept` | Public (one-time token) | Completes admin registration via invite link |
| **POST** | `/api/admin/auth/login` | Public (rate limited) | Admin login (admin & superadmin only; generic error for students) |
| **POST** | `/api/admin/team/invites` | `requireRole('superadmin')` | Creates one-time 48hr invite link for new admin |
| **GET** | `/api/admin/team` | `requireRole('superadmin')` | Lists admin team members with status and last login |
| **PATCH**| `/api/admin/team/:id` | `requireRole('superadmin')` | Disable/enable admin (last superadmin protected) |
| **POST** | `/api/admin/team/:id/reset-link` | `requireRole('superadmin')` | Generates password reset link for admin |
| **DELETE**| `/api/admin/team/:id` | `requireRole('superadmin')` | Deletes admin account (last superadmin protected) |
| **GET** | `/api/admin/audit` | `requireRole('superadmin')` | Superadmin audit log viewer with pagination and filtering |
| **GET** | `/api/admin/documents` | `requireAdminAuth` | List documents |
| **POST** | `/api/admin/documents/upload` | `requireAdminAuth` | Upload & index document (logs audit entry) |
| **POST** | `/api/admin/documents/reindex` | `requireAdminAuth` | Trigger full NLP index rebuild |
| **PATCH**| `/api/admin/documents/:id/status`| `requireAdminAuth` | Update status (logs audit entry) |
| **DELETE**| `/api/admin/documents/:id` | `requireAdminAuth` | Delete document (logs audit entry) |
| **GET** | `/api/admin/feedback/queue` | `requireAdminAuth` | Admin review queue |
| **PATCH**| `/api/admin/feedback/:id/review`| `requireAdminAuth` | Review feedback |
| **GET** | `/api/admin/feedback/export` | `requireAdminAuth` | Export feedback (logs audit entry) |
| **GET** | `/api/admin/analytics/overview` | `requireAdminAuth` | Dashboard analytics |
| **GET** | `/api/admin/analytics/export` | `requireAdminAuth` | Export CSV (logs audit entry) |
| **GET** | `/api/admin/cache-stats` | `requireAdminAuth` | Cache statistics |
| **POST** | `/api/admin/cache/invalidate` | `requireAdminAuth` | Cache invalidation |
| **GET** | `/api/admin/latency-stats` | `requireAdminAuth` | Latency metrics |
| **GET** | `/api/calendar/admin/events` | `requireAdminAuth` | Pending calendar events |
| **POST** | `/api/calendar/admin/events` | `requireAdminAuth` | Create manual event |
| **PUT** | `/api/calendar/admin/events/:id/approve` | `requireAdminAuth` | Approve calendar event |
| **PUT** | `/api/calendar/admin/events/:id/reject` | `requireAdminAuth` | Reject calendar event |
| **PUT** | `/api/calendar/admin/events/:id` | `requireAdminAuth` | Update calendar event |
