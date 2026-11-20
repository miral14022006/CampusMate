# Canned Replies Audit

This document catalogues every user-visible reply or fallback path in the system that produces a reply without grounded document chunks.

---

## Allowed User-Visible Replies:
1. **Grounded Answer**: Answer synthesized from retrieved document chunks with citation chip/source reference.
2. **Clarification Question**: Question asking for missing specific parameters (e.g. branch, semester, fee category) when intent is recognized.
3. **Factual Not Found**: Factual statement indicating no matching information was found in the uploaded documents, accompanied by a `decision_reason` (e.g., `NO_CHUNKS`, `LOW_EVIDENCE`).
4. **Structured Error**: A clear failure state with error code (e.g., `NLP_SERVICE_UNAVAILABLE`, `LLM_ERROR`), never disguising failures as successful replies.

---

## Catalogue of Paths Producing Non-Chunk Replies

| File | Line / Function | Trigger Condition | Reply Text / Content | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| `data/templates/clarification_templates.json` | Line 119 (`fallback.default`) | `DecisionPolicy._build_fallback()` | `"I'm not quite sure how to answer that accurately. For immediate assistance, please reach out to the relevant college desk:"` | Replaced by factual: `"No matching information was found in the uploaded documents."` |
| `data/templates/intent_responses.json` | Entire file (static templates) | Direct intent lookup bypassing documents | Static responses for fees, exams, syllabus, scholarships, etc. | Disabled/Bypassed for informational queries so all answers strictly require document retrieval. Kept only greetings/chitchat. |
| `server/routes/chat.js` | Lines 90-105 (`catch (nlpErr)`) | Upstream NLP timeout or failure | Previously returned canned *"Thank you for reaching out. The campus information service is currently operating in offline mode..."* | Removed. Now returns structured `{ mode: 'error', error: 'NLP_SERVICE_TIMEOUT' }`. |
| `nlp-service/features/f05_clarification/policy.py` | `_build_fallback()` | Insufficient retrieval score or `out_of_scope` | Generates fallback text with contact helpdesk. | Unified with standard `decision_reason` (`LOW_EVIDENCE`, `NO_CHUNKS`, `OUT_OF_SCOPE`). |
| `nlp-service/app/pipeline_stages/answer_stage.py` | `run()` | Decision is `FALLBACK` | Passes clarification / fallback text without citations. | Ensures `decision_reason` is explicitly set and preserved. |
| `server/routes/chat.js` | Student branch query injection | Exam/timetable queries | Injected `for <branch>` to query string. | Kept transparent, logged in trace for admin. |
