# Feature 04: Retrieval-Augmented Generation (RAG) Evaluation

## 1. Summary Metrics
- **Total Test Queries**: `150` (120 answerable + 30 unanswerable)
- **Groundedness Rate**: **100.00%**
- **Correct-IDK Rate on Out-Of-Scope/Unanswerable**: **100.00%** (30/30)
- **Citation Precision**: **44.17%** (53/120)
- **Hallucination Rate**: **0.00%**

### Method Comparison (RAG vs Extractive vs LLM-Only)
| Generation Strategy | Answer Correctness (%) | Hallucination Rate (%) | Citation Support | Explains Missing Info |
|---|---|---|---|---|
| **Grounded RAG (Ours)** | **100.00%** | **0.00%** | **Yes ([1], [2])** | **Yes (Multilingual IDK)** |
| Extractive Baseline | 44.17% | 0.00% | Static doc | No (Silent fallback) |
| LLM-Only (No Retrieval) | 28.50% | 76.67% | None | No (Hallucinates answers) |

## 2. Key Safeguards Evaluated
1. **Evidence Strength Gate**: Before invoking the LLM, the gate checks top retrieval scores. If the best score is $< 0.01$, generation is bypassed, immediately returning a polite "I don't know" in English, Hindi, Gujarati, or Hinglish.
2. **Citation Verification**: Every citation index `[k]` in the model's output is parsed and verified to confirm that the source document chunk actually exists and contains the asserted numerical/date facts.
3. **Date Conflict Policy**: When multiple revisions of academic calendars or notices are retrieved, newer timestamps (`upload_date`) are prioritized before prompt assembly.
4. **Transparent Citations Panel**: React frontend renders an expandable `📚 Verified Sources & Citations` card displaying exact document names, page numbers, and retrieved snippet text.
