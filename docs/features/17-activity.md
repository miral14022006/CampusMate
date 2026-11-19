# Feature 17: Activity Tracking and Admin Analytics

Feature 17 adds a privacy-conscious activity ledger plus the admin analytics API that powers the CampusMate dashboard. Every meaningful student, guest and admin interaction is stored as a typed `ActivityEvent`; aggregation applies de-duplication only for reporting.

Feature flags: `activity` and `dashboard` (see `server/config/features.js` and `client/src/config/features.js`).

---

## Data model

`server/features/f17_activity/models/ActivityEvent.js`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `userId` | ObjectId / null | Registered student or admin. Null for guests. |
| `clientId` | String / null | Anonymous browser/client id used to correlate guest sessions. |
| `actorType` | `student` \| `guest` \| `admin` | Derived from the authenticated user role. |
| `type` | enum | `signup`, `login`, `logout`, `chat_query`, `document_view`, `document_download`, `calendar_add`, `feedback`, `page_view`. |
| `meta` | object | Allow-listed fields: `docId`, `page`, `conversationId`, `intent`, `language`, `category`, `messageId`, `rating`, `semester`, `branch`, `path`, `source`. Unknown keys are dropped. |
| `ipHash` | String / null | Salted SHA-256 of the request IP. Raw IP addresses are never stored or returned. |
| `userAgentFamily` | String | Coarse `Browser / OS` family (e.g. `Chrome / Android`), never the raw user agent. |
| `isDemo` | Boolean | Demo/seed rows can be included or excluded from dashboards. |
| `createdAt` | Date | Event time. |

Indexes: `(type, createdAt)`, `(userId, createdAt)`, `(meta.docId, createdAt)`, `(clientId, createdAt)` and `createdAt`. If `ACTIVITY_RETENTION_DAYS` is set, a TTL index is added on `createdAt`. Retention is opt-in; the default is to keep events.

The tracker deliberately never throws. If MongoDB is disconnected it writes to a bounded in-memory ring buffer (5,000 events) so local development and tests still work. `recordInBackground()` schedules a write with `setImmediate` for request paths that must not block.

---

## Recording points

| Surface | Event | Hook |
| :--- | :--- | :--- |
| Student signup / login / logout / logout-all | `signup`, `login`, `logout` | `studentAuthRoutes.js` |
| Invite acceptance and admin login | `login` (actor `admin`) | `studentAuthRoutes.js`, `adminAuthRoutes.js` |
| Chat answer | `chat_query` with conversation, intent and language | `server/routes/chat.js` |
| Document stream | `document_view` (with optional page) or `document_download` | `f18_documents_public/documentRoutes.js` |
| Add to Google Calendar / ICS / direct insert | `calendar_add` | `POST /api/activity/calendar-add`, called by `AddToCalendarButton` |
| Feedback up/down | `feedback` | `f10_feedback/feedbackController.js` |
| Route/UI views | `page_view` | `POST /api/activity/page-view`, `POST /api/activity/event` |

Public beacons accept an optional `X-Client-Id` header. Guests without a client id are ignored rather than creating unattributable rows.

---

## De-duplication policy

All raw document views are stored. The dashboard reports both raw views and **unique view windows**.

A unique view is counted at most once per `(person, document)` per 30-minute window, where `person` is `userId` when signed in and `clientId` for guests. This prevents a page refresh, PDF re-render or retry from inflating the numbers while still respecting a student returning later. The same policy is implemented in:

- `uniqueViewWindows()` — pure helper used by tests and exports.
- `buildUniqueViewBuckets()` — MongoDB aggregation for `/api/admin/dashboard/overview` and document usage.
- `isViewWindowDuplicate()` — in-memory helper for fallback mode.

`VIEW_WINDOW_MS = 30 * 60 * 1000` is exported and shared by client-side expectations.

---

## Dashboard API

All routes are under `/api/admin/dashboard` and require an `admin` or `superadmin` access token (`requireAuth` + `requireRole`). Student/guest tokens receive `403`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/overview` | KPI cards with previous-period comparison, time series, weekday × hour heatmap, languages, intents, top documents, semester/branch breakdown and recent activity. |
| GET | `/students` | Paginated/searchable/sortable student table. Admin results are masked; superadmin results are full. |
| GET | `/students/:id/usage` | Per-day chart, viewed documents, intents, paginated event timeline. |
| PATCH | `/students/:id/status` | Enable/disable a student; revokes sessions and writes an audit entry. |
| GET | `/documents` | Document usage: views, unique viewers, downloads, citations, last viewed, per-document series and top pages. |
| GET | `/chats` | Paginated conversations with language, intent, fallback, feedback and identity. |
| GET | `/chats/:id` | Read-only transcript with pipeline metadata; writes `chat_transcript_viewed` to the audit log. |
| GET | `/activity` | Raw event stream with type, actor, student, date-range filters and pagination. |
| GET | `/students/export` | CSV. Masked for admin, full for superadmin. |
| GET | `/documents/export` | CSV usage export. |
| GET | `/chats/export` | CSV. Masked for admin. |
| GET | `/activity/export` | CSV, capped at 5,000 rows. |

Common query parameters: `from`, `to`, `granularity=hour|day|week`, `semester`, `branch`, `includeDemo=true|false|only`, `bust=1` to bypass cache.

### Caching

Responses are cached for 60 seconds (`DASHBOARD_CACHE_SECONDS`) via `serverCacheManager.getRaw/setRaw`, which uses Redis when configured and an in-memory fallback otherwise. Every response includes `cache: { hit, ttlSeconds }` and `executionTimeMs`. `?bust=1` bypasses and repopulates the cache. The dashboard UI's Refresh button sends a fresh `bust` value.

### Privacy

- Admins see masked names (`A*** P***`) and emails (`an***@pdeu.ac.in`). Superadmins see full identities.
- Chats/transcripts are read-only and opening one is audited.
- Activity rows expose ids and coarse metadata, not raw IPs or user agents.
- The audit viewer is superadmin-only and filters by action, actor id and date range.

---

## UI

The dashboard lives in `client/src/features/admin/dashboard/` and is mounted under nested `RoleGate` routes:

`/admin/dashboard`, `/admin/students`, `/admin/documents` (management + Usage tab), `/admin/chats`, `/admin/activity`, `/admin/review`, `/admin/dates`, `/admin/team` (superadmin), `/admin/audit` (superadmin).

The shell has a sticky tab bar with a sliding indicator, URL-backed date range (today/7d/30d/90d/custom), semester and branch filters, an explicit **Demo data** toggle, refresh and an “Updated x min ago” label.

Charts use copper, amber, sage, sky and slate series — no purple. Every chart offers a **View as table** alternative for keyboard/screen-reader users, and the chart canvas is `aria-hidden` with the table caption carrying the meaning. Drawers/dialogs use focus restoration and a Tab trap from the shared primitives. Motion respects `prefers-reduced-motion`.

---

## Seeding

```bash
NODE_PATH=server/node_modules \
MONGODB_URI=mongodb://localhost:27017/college_assistant \
node scripts/seedAnalytics.js --students=150 --events=20000 --days=90
```

This creates 150 `isDemo` students, 12 demo PDF documents (one superseded), ~20k activity events across 90 days, query analytics rows and 320 conversations with transcripts. Pass `--documents=0` to skip documents or `--includeDemo=false` to leave existing demo rows untouched. Remove them again with `--clean=true` (default).

---

## Tests

- `server/features/f17_activity/tests/activity.test.js` — hashing, UA family parsing, meta allow-list, non-throwing writes, memory fallback and 30-minute dedupe.
- `server/features/f11_analytics/tests/dashboardAggregations.test.js` — KPI math, masking, demo filters and unique view windows.
- `server/features/f18_documents_public/tests/documents.test.js` — active-only list, superseded reachability, guest view/download recording.

Run with `cd server && npm test -- --runInBand`.
