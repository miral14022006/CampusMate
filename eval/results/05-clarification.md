# Feature 05: Confidence-Based Fallback & Clarification Evaluation

## 1. Optimal Decision Threshold Configuration
- **Intent Classifier**: `MuRIL Transformer`
- **Optimal $T_{high}$**: `0.55`
- **Optimal $T_{low}$**: `0.25`
- **Margin Threshold**: `0.15`
- **Precision of Answered**: **100.0%**
- **Coverage (% Directly Answered)**: **75.0%**
- **Clarification Rate**: **13.67%**
- **Fallback Rate**: **11.33%**

### Transformer vs Baseline Policy Impact
| Metric | Baseline TF-IDF | MuRIL Transformer |
|---|---|---|
| Direct Answer Coverage (%) | 7.81% | **75.0%** |
| Answer Precision (%) | 100.0% | **100.0%** |
| Clarification Rate (%) | 13.67% | **13.67%** |
| Fallback Rate (%) | 78.52% | **11.33%** |

## 2. Threshold Sweep Comparison Table

| $T_{high}$ | $T_{low}$ | Coverage (%) | Precision (%) | Clarify Rate (%) | Fallback Rate (%) |
|-------------|------------|--------------|---------------|-------------------|-------------------|
| 0.55 | 0.25 | 75.0% | 100.0% | 13.67% | 11.33% |
| 0.55 | 0.3 | 75.0% | 100.0% | 13.28% | 11.72% |
| 0.55 | 0.35 | 75.0% | 100.0% | 11.72% | 13.28% |
| 0.55 | 0.4 | 75.0% | 100.0% | 10.16% | 14.84% |
| 0.6 | 0.25 | 71.09% | 100.0% | 17.58% | 11.33% |
| 0.6 | 0.3 | 71.09% | 100.0% | 17.19% | 11.72% |
| 0.6 | 0.35 | 71.09% | 100.0% | 15.62% | 13.28% |
| 0.6 | 0.4 | 71.09% | 100.0% | 14.06% | 14.84% |
| 0.65 | 0.25 | 67.58% | 100.0% | 21.09% | 11.33% |
| 0.65 | 0.3 | 67.58% | 100.0% | 20.7% | 11.72% |
| 0.65 | 0.35 | 67.58% | 100.0% | 19.14% | 13.28% |
| 0.65 | 0.4 | 67.58% | 100.0% | 17.58% | 14.84% |
| 0.7 | 0.25 | 58.98% | 100.0% | 29.69% | 11.33% |
| 0.7 | 0.3 | 58.98% | 100.0% | 29.3% | 11.72% |
| 0.7 | 0.35 | 58.98% | 100.0% | 27.73% | 13.28% |
| 0.7 | 0.4 | 58.98% | 100.0% | 26.17% | 14.84% |
| 0.75 | 0.25 | 46.48% | 100.0% | 42.19% | 11.33% |
| 0.75 | 0.3 | 46.48% | 100.0% | 41.8% | 11.72% |
| 0.75 | 0.35 | 46.48% | 100.0% | 40.23% | 13.28% |
| 0.75 | 0.4 | 46.48% | 100.0% | 38.67% | 14.84% |
| 0.8 | 0.25 | 32.81% | 100.0% | 55.86% | 11.33% |
| 0.8 | 0.3 | 32.81% | 100.0% | 55.47% | 11.72% |
| 0.8 | 0.35 | 32.81% | 100.0% | 53.91% | 13.28% |
| 0.8 | 0.4 | 32.81% | 100.0% | 52.34% | 14.84% |

## 3. Analysis & Key Insights
1. **Precision Guarantee**: With $T_{high}=0.55$, every directly answered query has verified confidence, yielding 100.0% accuracy on the validation set.
2. **Ambiguity Protection**: When two intents compete closely ($\Delta < 0.15$), the system generates multilingual candidate options (e.g., *Exam Form* vs *Fee Payment*) instead of returning the wrong response.
3. **Required Entity Slot Clarification**: Intents requiring parameters (such as `SEMESTER` for `exam_timetable`) are automatically intercepted, asking the student for the missing information with one-tap quick-reply chips.
4. **Office Contact Routing**: Fallback responses include specific college office locations, hours, phone numbers, and emails loaded dynamically from `data/contacts.json`.
