# Feature 15: Important Dates and Calendar Export

Feature 15 delivers automated extraction, verification, classification, and standards-compliant export of academic milestones and deadlines from campus notices into standard `.ics` feeds and direct Google Calendar integrations.

---

## 1. Architecture Overview

```
Document Ingest (PDF / Circular)
       │
       ▼
[nlp-service/features/f15_calendar_events/extractor.py]
  - Multilingual Month Lexicons (en, hi, gu, Hinglish)
  - Numeric & Range Detection (e.g. "10 to 20 Dec 2026")
  - Year Inference from document effective_date
       │
       ▼
[nlp-service/features/f15_calendar_events/classifier.py]
  - Maps to category: exam, fee, admission, holiday, result, other
  - Loads deterministic localized titles from data/templates/calendar_titles.json
       │
       ▼
Server Ingest Hook & Model [server/models/CalendarEvent.js]
  - Generates stable UID: cm_<hash>@campusmate.pdeu.ac.in
  - Increments SEQUENCE on updates
  - Status lifecycle: pending -> approved / rejected / superseded
       │
       ├── Public Calendar Endpoints (GET /api/calendar/events, /feed.ics, /:id.ics, POST /ics)
       ├── Direct Google Calendar Deep-Links (Asia/Kolkata timezone, exclusive end dates)
       └── Admin Review UI & API (approve, reject, edit candidates)
```

---

## 2. NLP Pipeline Components

- **`nlp-service/features/f15_calendar_events/extractor.py`**:
  - Implements `CalendarExtractor` with full multilingual regex support for English, Hindi (Devanagari numerals & month names), and Gujarati (Gujarati digits & months).
  - Handles single dates (`25/11/2026`, `25th November 2026`) and ranges (`10 to 20 Dec 2026`).
  - Filters out transient relative dates (`tomorrow`, `kal`, `aaj`, `next week`).
  - Automatically infers missing years from document `effective_date`, marking `needs_review=True`.
- **`nlp-service/features/f15_calendar_events/classifier.py`**:
  - Maps sentences to one of six official categories: `exam`, `fee`, `admission`, `holiday`, `result`, `other`.
  - Generates localized titles (`en`, `hi`, `gu`) deterministically using `data/templates/calendar_titles.json`, formatting extracted entities (e.g., semester numbers and course names).

---

## 3. Server Architecture & Endpoints

### Data Model (`server/models/CalendarEvent.js`)
- `title`, `titles` (`en`, `hi`, `gu`)
- `category` (`exam`, `fee`, `admission`, `holiday`, `result`, `other`)
- `startDate`, `endDate`, `allDay`
- `description`, `sourceDocId`, `sourceDocName`, `sourcePage`, `sourceChunkId`
- `semester`, `course`, `branch`
- `status` (`pending`, `approved`, `rejected`, `superseded`)
- `uid` (stable across document revisions)
- `sequence` (RFC 5545 revision counter, increments on update)
- `needsReview`, `confidence`

### Public Endpoints
- `GET /api/calendar/events`: Returns approved milestones with filters (`from`, `to`, `category`, `semester`) and precomputed Google Calendar URLs.
- `GET /api/calendar/events/:id.ics`: Downloads single event RFC 5545 file.
- `POST /api/calendar/ics`: Exports multiple selected events as a combined `.ics` bundle.
- `GET /api/calendar/feed.ics`: Subscribable live calendar feed with Asia/Kolkata timezone.

### Admin Endpoints (JWT Protected)
- `GET /api/calendar/admin/events`: Lists events by status (pending, approved, rejected, superseded).
- `POST /api/calendar/admin/events`: Manually creates events.
- `PUT /api/calendar/admin/events/:id/approve`: Approves a candidate event for public visibility.
- `PUT /api/calendar/admin/events/:id/reject`: Rejects an event.
- `PUT /api/calendar/admin/events/:id`: Edits event details.

### Ingestion Lifecycle Hooks
1. **Candidate Extraction**: Ingesting a document triggers extraction, storing events as `pending`.
2. **Version Superseding**: When a prior document is superseded, `markEventsSupersededByDocId` transitions previous events to `superseded`.
3. **Query Pipeline Integration**: Chat queries cite calendar milestones only when supported by retrieved context chunks.

---

## 4. RFC 5545 ICS Compliance Details

Implemented in `server/services/icsBuilder.js`:
- **Line Endings**: Strict `\r\n` (CRLF) endings.
- **Line Folding**: RFC-compliant folding at 75 octets.
- **Escaping**: Special characters (`;`, `,`, `\`, newlines) escaped.
- **All-Day Events**: Non-inclusive end date (`DTEND` set to next calendar day exclusive).
- **Timezone**: Native `Asia/Kolkata` timezone identifier (`TZID=Asia/Kolkata`).
- **Reminders**: Built-in `VALARM` display triggers at `-P1D` (1 day prior) and `-P3D` (3 days prior).

---

## 5. Evaluation Benchmark & Results

Evaluation executed across 66 multilingual sentences in English, Hindi, Gujarati, and Hinglish with 13 range patterns (`eval/calendar_dates_set.json`).

| Metric | Score |
|---|---|
| **Total Benchmark Sentences** | 66 |
| **Precision** | **100.00%** |
| **Recall** | **98.48%** |
| **F1 Score** | **99.24%** |
| **Range Exact Match** | **100.00%** (13 / 13) |

Results persisted in `eval/results/15-calendar.json`.

---

## 6. Optional Direct Google Calendar OAuth 2.0 Integration

### Overview & Operational Limits
CampusMate includes an optional OAuth 2.0 integration allowing students to insert events into their personal Google Calendar with a single click—bypassing the manual "Save" step via the Google Calendar REST API (`events.insert`).

> [!IMPORTANT]
> **Prerequisites & Google Cloud Platform Requirements**:
> 1. **Google Cloud Project**: A GCP project with the **Google Calendar API** enabled.
> 2. **OAuth Consent Screen**: Configured with the sensitive scope `https://www.googleapis.com/auth/calendar.events`.
> 3. **HTTPS Redirect URIs**: Google requires valid HTTPS redirect URIs (or `http://localhost` during development).
> 4. **Testing Mode & Approved Test Users**: Until Google approves and verifies the application, the OAuth consent screen operates in "Testing" status. It **only** authenticates users explicitly listed as authorized test users in the Google Cloud Console.
> 5. **Google App Verification**: Making this feature available for general public use requires completing Google's OAuth App Verification and Security Assessment process.

### Feature Flagging
This capability is disabled by default to keep the deployment zero-dependency and privacy-safe:
- **Server**: `FEATURE_CALENDAR_GOOGLE_OAUTH=false` (in `.env` and `server/config/features.js`).
- **Client**: `VITE_FEATURE_CALENDAR_GOOGLE_OAUTH=false` (in `client/src/config/features.js`).

### Token Security & AES-256-GCM Encryption
To protect user privacy and fulfill security standards:
- **Never In Client Code**: Tokens are strictly held on the server and are never delivered or exposed to the client application.
- **Encrypted At Rest**: Stored tokens in MongoDB (`CalendarOAuthToken`) are encrypted at rest using **AES-256-GCM** with a distinct 32-byte key (`GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`). Each encrypted token holds its own initialization vector (IV) and authentication tag.
- **Client Association**: Credentials are bound to the student's unique anonymous identifier (`X-Client-Id`). Students can disconnect their account at any time via `POST /api/calendar/oauth/disconnect`.

