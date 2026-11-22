# CampusMate — NLP & RAG Test Report

**Date:** November 20, 2026  
**Auditor:** Antigravity Autonomous Agent  
**Status:** **ALL TESTS PASSING**

---

## 1. Test Suite Summary

### A. Python NLP Pipeline Tests (`pytest nlp-service/tests/test_pipeline.py`)
- **Status:** **PASS** (6 passed in 10.38s)
- **Verified Components:**
  1. `test_language_detection`: Correctly detects English, Hindi (Devanagari), Gujarati script, Romanized Hinglish, and Romanized Gujlish.
  2. `test_preprocessing_and_slang`: Correctly normalizes Unicode NFKC and romanized conversational slang (`kb -> kab`, `h -> hai`).
  3. `test_transliteration_dual_form`: Dual-form query expansion enriches queries with Indic script terms for cross-lingual vector and keyword search.
  4. `test_intent_classification`: Accurately classifies college queries into required intents (`exam_form_deadline`, `exam_timetable`, `fee_payment`, `out_of_scope`).
  5. `test_entity_extraction`: Extracts branches (`Computer Science and Engineering`), semesters (`5`), and dates (`26.11.2026`).
  6. `test_retrieval_and_rag`: Retrieves actual college exam timetable PDF (`FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf`), generating grounded answers with exact source document and page number citations.

### B. Server Gateway Tests (`npm test` in `server/`)
- **Status:** **PASS** (9 suites, 55 tests passed in 4.15s)
- **Verified Suites:**
  - `features/f16_auth/tests/auth.test.js`: Student signup, login, superadmin, team invites, audit logs.
  - `tests/chat.test.js`: Primary `/api/chat` and `/api/chat/message` endpoints with nlpClient integration and citations.
  - `features/f08_admin/tests/documentDelete.test.js`: Document deletion and cache invalidation.
  - `features/f15_calendar/tests/calendar.test.js`: Calendar events, approvals, ICS feed.
  - `features/f18_documents_public/tests/documents.test.js`: Public document catalog.
  - `features/f17_activity/tests/activity.test.js`: Activity logging.
  - `features/f15_calendar/tests/tokenEncryption.test.js`: AES-256-GCM token encryption.
  - `features/f06_sessions/tests/sessionManager.test.js`: Session manager.
  - `features/f11_analytics/tests/dashboardAggregations.test.js`: Dashboard aggregations.

### C. Frontend Production Build (`npm run build` in `client/`)
- **Status:** **PASS** (Built in 3.56s into `client/dist`)
- **Verification:** 2,985 modules compiled with zero errors. All chatbot UI, document viewing, and admin dashboard components render cleanly.

---

## 2. Multilingual Query Verification Table

| Test Query | Language | Expected Fact | Grounded Assistant Output | Source Document & Citation | Result |
|---|---|---|---|---|---|
| *"When is the Scientific Writing and Publication Ethics exam?"* | English | Exam date & time (26.11.2026, 10am-1pm) | *"The exam for Scientific Writing and Publication Ethics (Course Code: 24HS501T) is scheduled for November 26, 2026, from 10:00 am to 01:00 pm [1]. This exam is for students in M.Tech - I (All Branches) [1]."* | `FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf` (Page 1) | **PASS** |
| *"Numerical Methods course code kya hai?"* | Hinglish | Course code `21MSP505T` | *"The course code for Numerical Methods & Computer Programming is 21MSP505T, and the coordinator is Dr. Balamurali K Mayya [1]."* | `FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf` (Page 1) | **PASS** |
| *"When was Independence Day holiday observed in 2024?"* | English | 15-08-2024 | *"Independence Day holiday in 2024 was observed on 15-08-2024 (Thursday) [1]."* | `List_of_General_Holidays-2024_1795166011274.pdf` (Page 1) | **PASS** |
| *"Final Dissertation Submission for UG and PG for FoLS kab hai?"* | Hinglish | 12th – 19th May, 2027 | *"Final Dissertation Submission for UG and PG for FoLS is scheduled for 12th – 19th May, 2027 [1]."* | `ACADEMIC_CALENDAR_2026-27_1795164746429.pdf` (Page 1) | **PASS** |
| *"Who is the current Prime Minister of Australia?"* | English | Out of scope | *"I couldn't find this information in the available college documents. Please reach out to the campus helpdesk for assistance."* | None | **PASS** |
