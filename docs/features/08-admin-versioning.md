# Feature 08: Document Ingestion, Automatic Re-Indexing, and Document Versioning

## 1. Overview & Architecture
College circulars and policy handbooks change constantly throughout an academic year (e.g. extension of examination form deadlines, revised fees, updated holiday lists). If old circulars remain active in search indices alongside newer notices, language models will retrieve conflicting information and generate contradictory answers.

Feature 08 establishes a **complete automated administrative document management and versioning pipeline**:
1. **Admin Authentication & RBAC**: Secure JWT authentication (`bcryptjs`, `jsonwebtoken`) with role-based access control protecting all document manipulation endpoints.
2. **Document Upload Pipeline**: Supports **PDF, DOCX, and TXT** with file size limits and SHA-256 checksum duplicate detection.
3. **Automated Topic-Key Versioning**: When a new document with an identical `topic_key` (e.g. `exam_form_deadline`) is uploaded:
   - The new upload is assigned `version = N + 1` and marked `status = 'active'`.
   - The prior version is marked `status = 'superseded'` and linked via `supersedes: ObjectId`.
   - Retrieval chunks inherit document `effective_date`, `version`, and `status`.
4. **Active Chunk Filtering**: Superseded chunks are excluded by default from the search indexes, guaranteeing that when dates conflict, the **newest active circular wins**.
5. **Admin Web Console**: Complete React UI featuring:
   - Document table with filtering by status (active/superseded/archived) and department.
   - Upload form with real-time processing indicators.
   - Index Status Card showing active index version and chunk counts.
   - **"Re-index All"** button that synchronizes BM25 and FAISS indexes and invalidates server Redis cache.

---

## 2. Files Involved
- [Document.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/models/Document.js): Mongoose model tracking title, topic_key, version, supersedes reference, status, checksum, chunk_count.
- [AdminUser.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/models/AdminUser.js): Mongoose model for administrator credentials and roles.
- [auth.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f08_admin/auth.js): JWT creation, verification, and `requireAdminAuth` middleware.
- [uploadMiddleware.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f08_admin/uploadMiddleware.js): Multer storage engine and SHA-256 checksum calculator.
- [documentController.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/features/f08_admin/documentController.js): Endpoints for `/api/admin/login`, `/api/admin/documents`, `/api/admin/documents/upload`, `/api/admin/documents/reindex`.
- [parser.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f08_ingest_api/parser.py): Python document text parser (pypdf, python-docx, text) and chunker.
- [ingest_manager.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f08_ingest_api/ingest_manager.py): Document ingestion manager maintaining chunk version status and index rebuilds.
- [endpoints.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f08_ingest_api/endpoints.py): FastAPI endpoints `POST /v1/documents/ingest` and `POST /v1/documents/reindex`.
- [AdminDashboard.jsx](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/client/src/features/admin/AdminDashboard.jsx): React administrative interface for document uploading, version tracking, and re-indexing.
- [demo_admin_versioning.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/scripts/demo_admin_versioning.py): End-to-end integration demo verifying deadline extension.

---

## 3. How to Run

### Seed Initial Admin User
```bash
node server/scripts/seedAdmin.js
```
*(Default credentials: `username: admin`, `password: Admin@123`)*

### Run Automated Versioning Integration Test
```bash
python3 scripts/demo_admin_versioning.py
```

### Run Unit Tests
```bash
PYTHONPATH=nlp-service python3 -m unittest features.f08_ingest_api.tests.test_versioning
```

---

## 4. End-to-End Test Scenario (Demo Walkthrough)

### Step 1: Upload Notice Version 1
- **File**: `notice_v1.txt`
- **Topic Key**: `exam_form_deadline`
- **Content**: *"Mid-Semester Examination form submission deadline without late fee is 15th September 2024."*
- **Query**: *"When is the deadline to submit the exam form?"*
- **Chatbot Answer**: *"The deadline for exam form submission is 15th September 2024 [1]."* (Verified)

### Step 2: Upload Notice Version 2 (Deadline Extension)
- **File**: `notice_v2.txt`
- **Topic Key**: `exam_form_deadline`
- **Content**: *"Notice: Exam form submission deadline has been extended to 22nd September 2024."*
- **Automatic Versioning Action**:
  - `notice_v1` status updated to **`SUPERSEDED`**.
  - `notice_v2` status assigned **`ACTIVE`** (`version: 2`).
  - Search indexes rebuilt and Redis cache invalidated.
- **Query**: *"When is the deadline to submit the exam form?"*
- **Chatbot Answer**: *"The deadline for exam form submission has been extended to 22nd September 2024 [1]."* (Verified)
- **Result**: The superseded deadline (15th September) was safely excluded with zero ambiguity.

