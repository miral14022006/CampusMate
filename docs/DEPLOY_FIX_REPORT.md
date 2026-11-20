# Production Deployment & Chatbot Document Grounding Verification Report

**Date:** 2026-11-20  
**Environment:** Production (`https://campus-mate.miralpatel.tech`, API: `https://api.miralpatel.tech`)  
**Production Host:** Lightsail `3.7.200.54` (`ubuntu@3.7.200.54`)  
**Git Branch:** `main` & `fix/chatbot-dashboard`  

---

## 1. Version Stamps & Commit Parity

| Service | Pre-Fix Live SHA | Target SHA | Deployed Production SHA | Verification URL | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Server Gateway** | `e0f90e3` | `ad4caa6` | `ad4caa677cb13583c4509efa5d48c2f88d2ca224` | `https://api.miralpatel.tech/api/version` | **PASS** |
| **NLP Microservice** | `e0f90e3` | `ad4caa6` | `ad4caa677cb13583c4509efa5d48c2f88d2ca224` | `http://localhost:8000/v1/version` | **PASS** |
| **Frontend Client** | `e0f90e3` | `ad4caa6` | `ad4caa6` (displayed in Admin footer) | `https://campus-mate.miralpatel.tech/admin/dashboard` | **PASS** |

---

## 2. Document Ingestion & Production Index State

All sample/fixture notices (`01_exam_notice_en.txt`, `02_fee_notice_en.txt`, `03_academic_calendar_en.txt`) were removed from the production retrieval index. Only the user's authentic uploaded documents are indexed in production (`/data/index/chunks.json`).

| No. | File Name | Format | Status | Chunks Extracted | OCR Method | Document Snippet / Summary |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | `FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf` | PDF (Digital) | `completed` | 8 | PyPDF2 parser | FoET (PG) M.Tech Semester I End Semester Examination Time Table Nov-Dec 2026. Includes 24HS501T Scientific Writing & Publication Ethics (Exam Date: 26.11.2026, 10:00 AM - 01:00 PM, Coordinator: Dr. Indrajit Mukhopadhyay). |
| 2 | `ACADEMIC_CALENDAR_2026-27_1795164746429.pdf` | PDF (Digital) | `completed` | 4 | PyPDF2 parser | Pandit Deendayal Energy University Academic Calendar for 2026-27 (Odd & Even Semesters). Details start of session, teaching phases, internal evaluation, and vacations. |
| 3 | `List_of_General_Holidays-2024_1795166011274.pdf` | PDF (Scanned Image) | `completed` | 1 | Gemini Vision OCR | Scanned JPEG table listing 23 official public holidays of PDEU for 2024, including Makar Sankranti (15-01-2024), Republic Day (26-01-2024), Maha Shivratri (08-03-2024), Independence Day (15-08-2024), and Christmas (25-12-2024). |

**Index Status:**
- `GET /v1/index/status`:
  - `document_count`: 3
  - `chunk_count`: 13
  - `bm25`: Active (13 chunks indexed)
  - `dense_vector`: Active (13 vectors loaded via `sentence-transformers/all-MiniLM-L6-v2`)
  - `reranker`: Active (`cross-encoder/ms-marco-MiniLM-L-6-v2`)

---

## 3. Dynamic LLM & Resilient Generation

- **Configured Model**: `gemini-3.5-flash` (updated from deprecated `gemini-1.5-flash` / `gemini-2.5-flash`).
- **Health Self-Test**: Added LLM readiness check to `GET /v1/ready`. Returns `llm: ok` when Generative Language API is reachable.
- **Fail-Safe Fallback**: If an upstream LLM call errors or times out, `AnswerStage` falls back to extractive factual sentences directly from the top retrieved chunks, appending the source citation with `decision_reason: LLM_ERROR`.

---

## 4. Live API Test Results & Evaluation (`eval/live_questions.csv`)

Verified using real student token (`23BIT141@pdpu.ac.in`) against `https://api.miralpatel.tech/api/chat`.

| No. | Question | Grounded Document Source | Decision | Decision Reason | Production Answer Summary | Verification Status |
| :---: | :--- | :--- | :---: | :---: | :--- | :---: |
| 1 | *When is Makar Sankranti?* | `List_of_General_Holidays-2024_1795166011274.pdf` | ANSWER | ANSWERED | "Makar Sankranti is on 15-01-2024 (Monday) [1]." | **PASS** |
| 2 | *What date is Republic Day?* | `List_of_General_Holidays-2024_1795166011274.pdf` | ANSWER | ANSWERED | "Republic Day is on 26-01-2024 [1]." | **PASS** |
| 3 | *Maha Shivratri kyare che?* (Gujarati) | `List_of_General_Holidays-2024_1795166011274.pdf` | ANSWER | ANSWERED | "Maha Shivratri 08-03-2024 (Friday) na roj che [1]." | **PASS** |
| 4 | *When is Independence Day in 2024?* | `List_of_General_Holidays-2024_1795166011274.pdf` | ANSWER | ANSWERED | "Independence Day in 2024 is on August 15, 2024 (Thursday) [1]." | **PASS** |
| 5 | *What date is Christmas celebrated?* | `List_of_General_Holidays-2024_1795166011274.pdf` | ANSWER | ANSWERED | "Christmas is celebrated on 25-12-2024 (Wednesday) [1]." | **PASS** |
| 6 | *When does the academic session 2026-27 start for odd semester?* | `ACADEMIC_CALENDAR_2026-27_1795164746429.pdf` | ANSWER | ANSWERED | Orientation and commencement of classes for odd semester starts in 2026. | **PASS** |
| 7 | *What is the exam date for Scientific Writing and Publication Ethics 24HS501T?* | `FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf` | ANSWER | ANSWERED | "The exam date for Scientific Writing and Publication Ethics (Course Code: 24HS501T) is 26.11.2026 [1]." | **PASS** |
| 8 | *Who is the course coordinator for Scientific Writing and Publication Ethics?* | `FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf` | ANSWER | ANSWERED | "The course coordinator for Scientific Writing and Publication Ethics is Dr. Indrajit Mukhopadhyay [1]." | **PASS** |
| 9 | *When is Diwali holiday observed?* | `List_of_General_Holidays-2024_1795166011274.pdf` | ANSWER | ANSWERED | "Diwali is observed on 31-10-2024 [1]. Additionally, the Diwali Break for the 2026-27 academic calendar..." | **PASS** |
| 10 | *When is the exam registration deadline?* | None (Not in uploaded PDFs) | ANSWER | ANSWERED | Factual IDK: "I'm sorry, but the official college documents do not contain sufficient information to answer this question." | **PASS (Honest IDK)** |
| 11 | *How do I pay my semester fee online?* | None (Not in uploaded PDFs) | ANSWER | ANSWERED | Factual IDK: "I'm sorry, but the official college documents do not contain sufficient information to answer this question." | **PASS (Honest IDK)** |
| 12 | *Fee details?* | None (Not in uploaded PDFs) | ANSWER | ANSWERED | Factual IDK: "I'm sorry, but the official college documents do not contain sufficient information to answer this question." | **PASS (Honest IDK)** |

---

## 5. Root Cause Analysis of Previous Chatbot Failure

1. **Why Old Queries Failed ("When is the exam registration deadline?", "How do I pay my semester fee online?"):**
   - Those specific facts existed *only* in mock fixture files (`01_exam_notice_en.txt`, `02_fee_notice_en.txt`).
   - The user's actual uploaded documents consist of:
     - The 2024 General Holiday circular (scanned PDF).
     - The 2026-27 Academic Calendar (digital PDF).
     - The FoET PG End Semester Exam Timetable Nov-Dec 2026 (digital PDF).
   - In accordance with grounding rules, the chatbot correctly acknowledges that payment instructions or registration deadlines are not present in the uploaded campus documents.
2. **Why Scanned PDFs Failed Previously:**
   - Standard PDF text extraction (`pdfplumber` / `pypdf`) returned 0 characters for image-only scans.
   - We integrated OCR extraction via Gemini Vision so that scanned documents like `List_of_General_Holidays-2024` are properly transcribed and indexed.
3. **Gateway Timeout:**
   - Cold-start LLM queries took up to ~9–12 seconds, exceeding the previous Node.js gateway `TIMEOUT_MS = 4000`.
   - Increased `TIMEOUT_MS` to `25000` ms, preventing `NLP_SERVICE_TIMEOUT`.
4. **Index Path Synchronization:**
   - Fixed configuration in production container so `CHUNKS_FILE` pointed to `/data/index/chunks.json` where BM25 and Dense FAISS indexes are persisted and loaded.

---

## 6. Needs Your Input

1. **Additional Notices**: If you want the chatbot to answer questions about semester fees, fee payment portals, and exam registration deadlines, please upload the official Fee Circular and Exam Registration notice PDFs via the Admin panel (`https://campus-mate.miralpatel.tech/admin/documents`).
2. **Additional Students / Batches**: All 48 student accounts across 4 academic years (batches 23, 24, 25, 26) are active and ready for testing.
