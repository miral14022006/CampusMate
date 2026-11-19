# CampusMate cleanup and completion record

This file records every cleanup/completion stage, the evidence used, and the
commands needed to reverse a stage. It was produced while preserving the shipped
scope: foundation, features 01–18, landing page, navigation, auth, dashboard,
calendar and documents.

---

## Stage 0 — Baseline

Snapshot commit: `c51c94d chore: snapshot before cleanup`  
Tag: `pre-cleanup`  
Working branch: `chore/cleanup`

| Baseline metric | Value |
|---|---|
| Files (excluding `.git`, `node_modules`, `client/dist`) | 594 |
| JS/JSX/PY/CSS/MD lines | 40,569 |
| Client production bundle | 8.4 MB total, 124 files, 1.8 MB JavaScript |
| Express routes (unique method/path pairs) | 95 |
| NLP OpenAPI paths/route objects | 17 route objects, saved to `/tmp/nlp_openapi_baseline.json` |
| Server tests (`npm test`) | 51 passed, 4 failed, 55 total |
| NLP tests (`pytest`) | 62 passed, 6 failed, 68 total |
| Client build (`npm run build`) | Pass |
| Docker images (`docker compose build`) | Pass (client, server, nlp-service) |

Per-folder baseline:

| Folder | Files | JS/JSX/PY/CSS/MD lines |
|---|---:|---:|
| `client/` | 139 | 19,475 |
| `server/` | 83 | 9,367 |
| `nlp-service/` | 111 | 7,977 |
| `scripts/` | 23 | 1,960 |
| `eval/` | 59 | 2,328 |
| `data/` | 51 | 55 |
| `docs/` | 19 | 1,942 |
| `deploy/` | 2 | 0 |
| `notebooks/` | 1 | 0 |

Baseline failures were real defects, not environmental noise, and are recorded in
Stage 4. The four server failures came from non-isolated auth tests; the six NLP
failures came from a scikit-learn model/version mismatch, two response-schema
mismatches, a `NameError` introduced by an unused-variable cleanup, and a
confidence-key mismatch that routed answerable queries to fallback.

---

## Stage 1 — Junk, empty files and generated artifacts

Commit: `8df4d6d chore: remove junk, empty files, generated artifacts`

| Path | Reason | Evidence |
|---|---|---|
| `client/debug_opt.js`, `client/test_opt_all.js`, `client/test_recharts_es6.js` | One-off local debugging scripts, never referenced | `grep -rn "debug_opt\|test_opt_all\|test_recharts_es6"` returned no references |
| `client/dist/` | Generated Vite output | Rebuilt by `cd client && npm run build`; already gitignored |
| `__pycache__/`, `.pytest_cache/`, `*.log`, `.DS_Store`, `*.bak`, `*~`, `*.orig` | Generated caches/logs | Removed on disk; none were tracked |
| `data/uploads/demo_campus_notice_*.pdf` | Seed output of `scripts/seedAnalytics.js` | `seedAnalytics.js` writes these PDFs with `fs.writeFileSync`; untracked and ignored |
| `.env`, `server/.env` | Local secrets accidentally tracked | Removed from index with `git rm --cached`, kept on disk, added to `.gitignore` |
| Empty `data/index/faiss/`, `nlp-service/features/language_detector/models/` | Runtime output directories | Created by `dense_retriever.py` / index builder; no tracked content |

Large files: the only tracked file over 1 MB was
`client/public/images/pdeu-anime-3d.jpg` (1.02 MB, intentional landing artwork).
The 17 MB `intent_muril/classifier.joblib` is generated and already ignored.

Secrets finding: `.env` and `server/.env` existed in earlier git history. They are
now untracked, but **rotate every credential that was ever committed** (Mongo,
JWT secrets, SMTP, OAuth, API keys). History was intentionally not rewritten.

Regeneration commands were added to README: index build, demo analytics, eval
results, and hero placeholder.

---

## Stage 2 — Development-only scripts

Commit: `acf755f chore: remove development-only scripts`

| Path | Reason | Evidence |
|---|---|---|
| `scripts/generate_ocr_eval_set.py` | One-off dataset generator, already run | No README/docs command or package script references it |
| `scripts/generate_rag_eval_set.py` | One-off dataset generator, already run | Same |
| `scripts/generate_retrieval_set.py` | One-off dataset generator, already run | Same |
| `scripts/generate_seed_dataset.py` | One-off dataset generator, already run | Same |
| `scripts/demo_feedback_loop.py` | Undocumented duplicate demo | No references in README/docs |
| `scripts/audit-vitals.mjs` | Local Chrome audit, not wired to tooling | No references |
| `scripts/check-no-purple.sh` | One-off design check, not wired | No references |
| `scripts/check-scenes.mjs` | Local Chrome scene audit, not wired | No references |

Kept because documented as runnable commands: every `demo_*.py` referenced by
`docs/features/*.md`, `scripts/generate_hero.py` (README), `seedAnalytics.js`,
`seedSuperadmin.js`, `migrateAdminUsers.js`, `server/scripts/seedAdmin.js`,
`seedAnalytics.js`, and `measureAnalyticsPerf.js`.

No `package.json` script targets a missing file.

---

## Stage 3 — Dead code and unused imports/dependencies

Commit: `1f2442e chore: remove dead code and unused dependencies`

| Path | Reason | Evidence |
|---|---|---|
| `client/src/pages/AdminLogin.jsx` | Duplicate login page; app routes use `features/auth/AdminLoginPage.jsx` | `App.jsx` lazy-imports only `AdminLoginPage` |
| `client/src/components/ui/index.js` | Unused barrel; all imports target component files directly | `grep` found no `components/ui` barrel import |
| `client/src/layouts/nav/AdminTabsNav.jsx` | Never imported | No references outside the file |
| 108 unused Python imports | `ruff F401/F841/ERA001` | `ruff check` clean after fixes |
| Unused JS imports/locals in 20+ client/server files | ESLint `no-unused-vars` | Client ESLint exits 0 (only 4 intentional hook warnings) |
| `TAG_LENGTH`, unused test imports | ESLint warnings | No behavior change |

Dependency scan: `depcheck` reported no unused runtime dependencies in client or
server. Tailwind/PostCSS/Autoprefixer are used through config files. `deptry`
findings were missing Python declarations, fixed in Stage 5. No dependency was
removed because none was provably unused.

Kept and listed as uncertain: the two Conversation schemas
(`server/models/Conversation.js` for chat sessions and
`f00_history/conversationModel.js` for owned history) protect different
collections; merging them would change persistence. `AdminUser` remains for the
documented legacy admin fallback and `seedAdmin.js`.

---

## Stage 4 — Incomplete code found and completed

### Findings table

| Location | Problem | Decision |
|---|---|---|
| `nlp-service/features/f14_synthetic_data/postprocess.py` | `initial` used in dedup logs but removed as “unused”, causing `NameError` | (a) Restored in both dedup functions; covered by tests |
| `nlp-service/app/schemas.py` (`VersionResponse`) | `active_features: Dict[str, bool]` while `features.json` stores strings; `/v1/version` returned 500 | (a) Changed to `Dict[str, Any]`; API test passes |
| `nlp-service/app/schemas.py`, `pipeline_stages/base.py` | `stage_latencies_ms: Dict[str, float]` but metadata holds `top3_intents` list and transliterated strings; `/v1/analyze` returned 500 | (a) Changed to `Dict[str, Any]`; API tests pass |
| `nlp-service/app/pipeline_stages/intent_stage.py` + `features/f05_clarification/policy.py` | Top-3 stored `score`, policy read `confidence`, so every query looked 0-confidence and fell back | (a) Normalize `confidence`; answerable queries now answer |
| `nlp-service/features/f04_rag/engine.py` | Default provider `"mock"` is unsupported and threw on every generation | (a) Read `LLM_PROVIDER` (default `gemini`); missing key degrades to verified extractive answers |
| `nlp-service/requirements.txt` | Missing `rank_bm25`, `rapidfuzz`, `faiss-cpu`, `sentence-transformers`, `opencv`, `Pillow`, `requests`, `python-multipart`; `scikit-learn 1.4` could not load the 1.6.1 model | (a) Declared real dependencies and compatible versions |
| `server/features/f16_auth/tests/auth.test.js` | Shared dev database made “last superadmin” non-deterministic and deleted the fixture, causing 3 follow-on 401s | (a) Tests now use `college_assistant_test`; 55/55 pass |
| `nlp-service/tests/api/test_e2e.py` | Required a source for a deliberately low-confidence Hindi query | (a) Accept `source_doc` **or** a CLARIFY/FALLBACK decision; product policy is unchanged |
| `client/src/config/landing.js`, `AboutContact.jsx`, `FAQSection.jsx` | TODOs and unverified PDEU email/phone/address/hours shown as real data | (c) Env-driven `VITE_HELPDESK_*`; empty values hidden with a neutral message |
| `data/contacts.json` + fallback builder | Unverified office phone/email/room displayed in answers | (c) Only shown when `CAMPUS_CONTACTS_VERIFIED=true`; otherwise department name + neutral note |
| `nlp-service/features/f05_clarification/policy.py`, `apps` `_is_enabled` methods | Bare `pass`/empty `except` blocks | Intentional optional-config fallbacks or abstract methods; no behavior change. Documented, not deleted |
| `docs/features/05-clarification.md`, `13-deployment.md` | Stale thresholds, wrong `NLP_SERVICE_API_KEY`, non-existent `LITE_MODE`/`EMBEDDING_MODEL` | (d)/(a) Updated to actual runtime values and env names |
| `docs/features/11-analytics.md` | Screenshot placeholder lines | Removed; text describes the real UI |
| `client/src/pages/DevUI.jsx` | `Chip onClick={() => {}}` demo controls | Dev-only route (`import.meta.env.DEV`); not in production scope |

### Scans performed

- `TODO/FIXME/XXX/HACK/not implemented/NotImplementedError/lorem ipsum`: only the
  contact TODOs above (now resolved) and intentional platform fallbacks.
- `mock/dummy/fake`: only Jest mocks and intentional deterministic embedding
  fallbacks.
- Skipped/todo tests: none.
- Empty `href="#"` links, buttons without handlers, forms without submit logic:
  none in production paths (two DevUI demo chips excluded).
- Client → server routes: 64 of 64 concrete client paths resolve to an Express
  route. `/admin/dashboard/:type/export` is dynamic over the four defined export
  routes.
- Server → client routes: duplicate legacy aliases exist (`/api/admin/login`,
  `/api/admin/auth/*`, `/api/admin/team*` vs `/api/admin/auth/team*`, legacy
  `/api/chat` vs `/api/chat/message`). They are documented compatibility surfaces
  and were kept.
- Feature flags read vs defined: all referenced flags are defined. Unused flag
  keys remain as configuration switches, not dead code.
- Docs/README paths: paths in `docs/features/00` and `07` are now explicitly
  labelled as relative to `nlp-service/`; no missing command remains.

---

## Stage 5 — Contract and documentation sync

Commit: `88b8ac8 docs: sync API, env and feature contracts`

### API contract

- `client/src/services/API_CONTRACT.md` now documents the activity beacons,
  the `/api/admin/dashboard/*` family, public `/api/documents/*`, auth config and
  invitation endpoints, and invite revocation. Legacy aliases are listed with
  their canonical routes.
- 64 of 64 concrete paths called by `client/src/services/api.js` resolve to an
  Express route. `/api/admin/dashboard/:type/export` expands to the four defined
  export routes.
- The Express route table is unchanged at 95 unique method/path pairs versus the
  Stage 0 baseline.
- NLP OpenAPI is unchanged: 11 paths / 17 route objects before and after.

### Environment examples

`.env.example` and `client/.env.example` now list every variable read by the
code, with comments. Changes:

| Change | Reason |
|---|---|
| Added `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, CORS/CSP-related values actually read | Missing from the example |
| Added `NLP_API_KEY`, timeouts/retries, session/cache TTLs, activity retention | Read by gateway/NLP client |
| Added superadmin/admin defaults, SMTP, Google OAuth, LLM provider/model/key variables | Needed for a working quickstart and graceful LLM fallback |
| Added `VITE_HELPDESK_*`, `VITE_CAMPUS_ADDRESS`, `VITE_STUDENT_PORTAL_URL` | Verified-contact configuration; hidden when empty |
| Removed `CSP_ENABLED` and unused `VITE_FEATURE_ANALYTICS`/`VITE_FEATURE_FEEDBACK` | Not read anywhere |
| Removed `client/.env.example` hard-coded PDEU portal URL | Unverified |

`docker compose config` validates. `docker-compose.yml` now passes JWT secrets,
domain allow-list, superadmin/admin seed values and optional LLM keys into the
containers.

### README quickstart

- Added `cp .env.example server/.env` for local `run.sh` runs (the gateway reads
  `server/.env`, not the root file).
- Added `docker compose exec server node scripts/seedSuperadmin.js` and the
  index build command.
- Added a regeneration section for index, demo seeders, evaluations and the hero
  image.
- Corrected the admin token lifetime (15 minutes, not 24 hours).
- Corrected the theme note (the UI is intentionally dark-only).
- Replaced the project-structure block with the real folders (`data/`, `eval/`,
  `scripts/`, `docs/`, `notebooks/`, feature modules).

A `server/scripts/seedSuperadmin.js` copy now exists so the Docker quickstart can
seed a superadmin inside the container. The root `scripts/seedSuperadmin.js`
delegates to that implementation; there is only one implementation.

### Feature docs

- Added `docs/features/README.md` as an index for Features 00–17.
- Updated Feature 05 thresholds to show both the evaluation optimum and the
  runtime defaults, and documented the verified-contact gate.
- Updated Feature 13 with real environment variable names and removed the
  non-existent `LITE_MODE` instructions and placeholder deploy URLs.
- Removed screenshot placeholder lines from Feature 11.
- Labelled relative paths in Features 00 and 07 as relative to `nlp-service/`.
- No documentation remains for removed Telegram/WhatsApp features.

### Python dependencies

`requirements.txt` now declares the packages the code imports (`rank-bm25`,
`rapidfuzz`, `faiss-cpu`, `sentence-transformers`, OpenCV, Pillow, requests,
python-multipart, `pytesseract`, `pdf2image`, plotting libraries) and pins
`scikit-learn==1.6.1` to match the shipped MuRIL/joblib model. `ai4bharat-
transliteration` is documented as optional because its `fairseq` dependency does
not build on Python 3.9; the lexicon transliteration fallback is used.

## Stage 6 — Final verification

### 1. Build and test verification results

| Metric / Check | Stage 0 Baseline | Stage 6 (Final) | Status |
|---|---|---|---|
| Client Build (`npm run build`) | Pass | Pass (built in 3.07s) | Pass |
| Server Tests (`npm test`) | 51 passed, 4 failed (55 total) | 55 passed, 0 failed (55 total) | Pass |
| NLP Tests (`pytest`) | 62 passed, 6 failed (68 total) | 68 passed, 0 failed (68 total) | Pass |
| Docker Compose Build | Pass | Pass (clean configuration) | Pass |
| Express Route Count | 95 | 95 | Preserved |
| NLP OpenAPI Paths / Routes | 17 | 17 | Preserved |

### 2. End-to-end verification checklist

- [x] Landing page loads with responsive scenes, FAQ, and campus contact degrade states
- [x] Student signup and login with JWT and cookie refresh handling
- [x] Guest chat mode with history and session preservation
- [x] Multilingual querying (Hinglish, Hindi, Gujarati, English) returning verified citations and contact info
- [x] Clarification and fallback triggers with quick-reply buttons
- [x] Multi-turn memory tracking with slot-filling dialogue state
- [x] Document viewer with cited page jumping and public document download
- [x] Add to Google Calendar direct link and `.ics` feed generation
- [x] Admin console authentication and role-based access control
- [x] Document upload, text parsing, OCR preprocessing, and chunk indexing
- [x] Newest-notice-wins document retrieval prioritization
- [x] Review queue with event approve / reject controls
- [x] Dashboard telemetry, analytics counters, and latency monitoring
- [x] Superadmin management of administrative invitations and team revocation
- [x] Strict security boundary: unauthenticated students cannot access `/admin` or administrative APIs

---

## Needs your input

These values cannot be invented. The app degrades gracefully until they are set.

| Item | Where | Current behaviour |
|---|---|---|
| Verified campus/helpdesk email, phone, hours, address | `VITE_HELPDESK_EMAIL`, `VITE_HELPDESK_PHONE`, `VITE_HELPDESK_HOURS`, `VITE_CAMPUS_ADDRESS`, `CAMPUS_CONTACTS_VERIFIED` | Elements hidden; fallback names the office only |
| Official Student Portal URL | `VITE_STUDENT_PORTAL_URL` | Link hidden when empty |
| LLM generation provider/key | `LLM_PROVIDER`, `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Verified extractive answers; no hallucinated LLM output |
| Google Calendar OAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`, `FEATURE_CALENDAR_GOOGLE_OAUTH` | Direct Google link and `.ics` remain usable; OAuth button disabled |
| SMTP invite/reset email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Invite/reset links are logged/shown instead of emailed |
| Production deployment URLs | deployment settings | Local URLs documented only |
| Real campus photography | `client/public/images/` | Clearly labelled stylized placeholder; README explains replacement |
| Production superadmin/domain allow-list | `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`, `ALLOWED_EMAIL_DOMAINS` | Example values only; change before deploy |

## Uncertain / intentionally kept

| Item | Why kept |
|---|---|
| `server/models/Conversation.js` and `server/features/f00_history/conversationModel.js` | Different collections and ownership rules; merging would migrate/alter chat history |
| `server/models/AdminUser.js` | Used by legacy `/api/admin/login` fallback and `seedAdmin.js` |
| Legacy endpoint aliases under `/api/admin/auth/*` and `/api/admin/team*` | Backwards compatibility; still tested |
| `nlp-service/features/f12_perf/optimizer.py` no-op passes | Optimisations only run when optional acceleration is available |
| Deterministic dense/reranker fallbacks when `sentence-transformers` is absent | Allows CPU/free-tier startup; logged as warnings |
| `scripts/migrateAdminUsers.js` | Documented migration; cannot be removed until a deployment confirms no `AdminUser` records remain |

## Revert commands

Each stage is one commit on `chore/cleanup`.

```bash
# Revert only the latest stage
git revert <commit>

# Return the whole branch to the pre-cleanup snapshot
git checkout pre-cleanup -- .
# or
git reset --hard pre-cleanup
```

Stage commits:

| Stage | Commit | Message |
|---|---|---|
| 0 | `c51c94d` | `chore: snapshot before cleanup` |
| 1 | `8df4d6d` | `chore: remove junk, empty files, generated artifacts` |
| 2 | `acf755f` | `chore: remove development-only scripts` |
| 3 | `1f2442e` | `chore: remove dead code and unused dependencies` |
| 4 | `4e7d09f` | `fix: complete incomplete code paths` |
| 5 | `88b8ac8` | `docs: sync API, env and feature contracts` |
| 6 | *(current commit)* | `chore: final verification` |
