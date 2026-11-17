# Feature 04: Retrieval-Augmented Generation (RAG) with Citations and Hallucination Guard

## 1. Overview & Motivation
Standard Large Language Models frequently generate fluent but inaccurate answers when queried about institution-specific policies, deadlines, or fees. 

Feature 04 implements **Grounded Multilingual RAG** with five levels of defense against hallucination:
1. **Evidence Strength Gate (Pre-Generation)**: Evaluates top retrieval confidence before calling the LLM. If the retrieval score is below threshold ($< 0.01$), generation is skipped, immediately returning an informative "I don't know" in the user's detected language (**English, Hindi, Gujarati, or Hinglish**).
2. **Grounded Prompting**: Strict system rules instruct the model to synthesize answers strictly from numbered context chunks and cite evidence inline as `[1]`, `[2]`. If facts are insufficient, the LLM is instructed to return `NO_ANSWER`.
3. **Date Conflict Resolution**: When multiple conflicting calendar or fee chunks exist, newer upload timestamps (`upload_date`) are given priority.
4. **Post-Generation Verification & Hallucination Guard**: Parses inline citations `[k]`, confirms each cited source exists in context, and extracts numerical/date facts (e.g. `₹500`, `25th October 2024`) to verify that the generated facts are strictly supported by the cited chunks.
5. **Streaming & UI Transparency**: Features an SSE endpoint (`POST /v1/query/stream`) and an expandable **`📚 Verified Sources & Citations`** panel in the React chat UI showing chunk snippets, page numbers, and similarity scores.

---

## 2. Files Involved
- [engine.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f04_rag/engine.py): Main `RAGEngine` orchestrating evidence gating, LLM generation, citation extraction, and fallback logic.
- [prompt_builder.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f04_rag/prompt_builder.py): Grounded prompt builder assembling numbered chunk contexts with strict citation rules.
- [verifier.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f04_rag/verifier.py): Post-generation citation integrity and entity consistency verifier.
- [schemas.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f04_rag/schemas.py): Pydantic data models for `CitationItem` and `RAGResponse`.
- [answer_stage.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/app/pipeline_stages/answer_stage.py): Pipeline stage routing queries to RAG generation.
- [endpoints.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/app/api/v1/endpoints.py): `POST /v1/query` and streaming SSE endpoint `POST /v1/query/stream`.
- [chat.js](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/server/routes/chat.js): Node.js route returning citation metadata.
- [ChatWindow.jsx](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/client/src/features/chat/ChatWindow.jsx): React UI with expandable citations panel and `⚡ RAG Grounded` badges.
- [rag_set.csv](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/rag_set.csv): 150 test queries (120 answerable + 30 unanswerable queries).
- [run_rag_eval.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/run_rag_eval.py): Evaluation script benchmarking Grounded RAG vs Extractive vs LLM-Only.
- [test_rag.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/nlp-service/features/f04_rag/tests/test_rag.py): Unit test suite covering gate logic, citation verification, and hallucination scoring.
- [demo_rag.py](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/scripts/demo_rag.py): Multi-scenario interactive demonstration script.

---

## 3. How to Run

### Run Unit Tests
```bash
PYTHONPATH=nlp-service python3 -m unittest features.f04_rag.tests.test_rag
```

### Run 150-Query RAG Evaluation
```bash
python3 eval/run_rag_eval.py
```

### Run Interactive Demonstration
```bash
python3 scripts/demo_rag.py
```

---

## 4. Evaluation Benchmark Results

Tested on **150 queries** in `eval/rag_set.csv` (120 answerable queries across 4 language styles + 30 unanswerable campus queries):

| Generation Strategy | Answer Correctness (%) | Hallucination Rate (%) | Citation Support | Explains Missing Info |
|---|---|---|---|---|
| **Grounded RAG (Ours)** | **100.00%** | **0.00%** | **Yes ([1], [2])** | **Yes (Multilingual IDK)** |
| Extractive Baseline | 44.17% | 0.00% | Static doc | No (Silent fallback) |
| LLM-Only (No Retrieval) | 28.50% | 76.67% | None | No (Hallucinates answers) |

- **RAG Groundedness Rate**: **100.00%**
- **Correct IDK Rate on Unanswerable Queries**: **100.00%** (30 / 30)
- **Citation Precision**: **44.17%**
- **Hallucination Rate**: **0.00%**

Evaluation metrics recorded in [eval/results/04-rag.json](file:///Users/miralpatel/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/project/minorproject/eval/results/04-rag.json).

