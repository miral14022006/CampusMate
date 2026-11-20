# CampusMate Fix & Verification Report

## 1. Summary of Changes Implemented

### Chatbot Pipeline (Stages 2 & 3)
1. **Retrieval Made Primary**:
   - In `nlp-service/features/f05_clarification/policy.py`, updated decision logic so that if retrieval discovers strong document evidence (score $\ge 0.028$ or normalized reranker score $\ge 0.50$), the decision is automatically `ANSWER` (or `CLARIFY` if a required slot like semester is missing), regardless of whether the intent classifier classified the query as `out_of_scope` or had low confidence.
2. **Elimination of Canned "Offline Mode" Responses**:
   - In `server/routes/chat.js`, removed the fallback block returning *"Thank you for reaching out. The campus information service is currently operating in offline mode..."*.
   - When the NLP microservice is unreachable, the server returns a structured `{ mode: "error", error: "NLP_SERVICE_UNAVAILABLE" }` with HTTP 503 so the frontend shows a clean retryable state.
3. **Clean Fallback & Single-Field Rendering**:
   - In `policy.py`, eliminated duplicate fallback messages and raw `**` asterisks when contact details are not verified.
   - In `client/src/features/chat/ChatMessage.jsx`, restricted the warning *"This answer may not be grounded..."* to only appear when `generationMode === 'rag'` or `'extractive'` and `grounded === false` (never on `FALLBACK`, `CLARIFY`, or error).
4. **Readiness & Hot Reloading**:
   - Added `/v1/ready` and `/v1/index/status` to `nlp-service/app/api/v1/endpoints.py` and `app/main.py`.
   - Wired `server/server.js` `/health` to query `nlpClient.health()`.
   - Connected `AdminLayout.jsx` operational pill to real `/health` status.
   - Updated `ingest_manager.py` to hot-reload `bm25_retriever` and `dense_retriever` immediately upon document ingestion.
   - Added OCR warning status in `documentController.js` and `Document.js` model if 0 chunks are extracted.

### Admin Dashboard Real Data (Stage 4)
1. **Purged Demo / Synthetic Data**:
   - Deleted `server/scripts/seedAnalytics.js` and `server/features/f11_analytics/syntheticDataSeeder.js`.
   - Removed the "Demo data" toggle from `DashboardFilters.jsx`.
   - Enforced `{ isSeeded: { $ne: true } }` and `{ isDemo: { $ne: true } }` across all MongoDB aggregation pipelines.
2. **Dashboard Verification**:
   - Created `server/scripts/verifyDashboard.js` to cross-verify database collections against dashboard aggregations.
   - Created `docs/DASHBOARD_AUDIT.md` documenting every KPI, collection, and aggregation pipeline.

---

## 2. Test Verification Across Target Queries

| Query | Decision | Decision Reason | Top Matched Document | Output / Extracted Answer |
| :--- | :--- | :--- | :--- | :--- |
| **"When is the exam registration deadline?"** | `ANSWER` | `ANSWERED` | `01_exam_notice_en.txt` | "According to the official examination circular, the exam registration form portal is open from 1st October to 20th October..." |
| **"exam date"** | `ANSWER` | `ANSWERED` | `03_academic_calendar_en.txt` | Extracted examination dates from academic calendar document |
| **"exam time table"** | `CLARIFY` | `CLARIFY_SLOT` | `03_academic_calendar_en.txt` | "Which semester timetable/information are you looking for? (e.g., Sem 1, Sem 3, Sem 5, Sem 7)..." |
| **"How do I pay my semester fee online?"** | `ANSWER` | `ANSWERED` | `02_fee_notice_en.txt` | "College fees must be paid online via the ERP portal (erp.college.edu) using NetBanking, Card, or UPI...." |
| **"Exam schedule?"** | `CLARIFY` | `CLARIFY_SLOT` | `03_academic_calendar_en.txt` | "Which semester timetable/information are you looking for? (e.g., Sem 1, Sem 3, Sem 5, Sem 7)..." |
| **"Fee details?"** | `ANSWER` | `ANSWERED` | `02_fee_notice_en.txt` | "The annual tuition fee is Rs 85,000 for BTech, plus Rs 8,000 lab fee, payable in two semester installments...." |

All 9 server test suites (55 unit and integration tests) passed cleanly, and the client built with zero errors.

---

## 3. Git Commits
- Tag `pre-fix` was created prior to changes.
- Branch: `fix/chatbot-dashboard`
- Commits:
  - `2412b06`: `docs: add Stage 1 root cause analysis and evidence report`
  - `0750955`: `fix(auth): restore Link in student menu and update retrieval eval results`
  - `204df12`: `feat(pipeline-dashboard): make retrieval primary, fix ingestion, clean chat fallback, and enforce real dashboard data`
