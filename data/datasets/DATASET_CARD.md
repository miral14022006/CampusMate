# Dataset Card: Multilingual College Assistant Synthetic Corpus (Feature 14)

## Dataset Summary
The **Multilingual College Assistant Synthetic Corpus** is a balanced, high-diversity conversational dataset engineered to train and evaluate transformer-based intent classifiers and dialogue agents for Indian collegiate environments. It covers **20 core academic intents** across **5 distinct linguistic formats**: English (`en`), Hindi (`hi`), Gujarati (`gu`), Hinglish (`hi-Latn`), and Gujlish (`gu-Latn`).

## Dataset Structure
- `data/datasets/train.csv`: 1,189 queries (70%)
- `data/datasets/val.csv`: 256 queries (15%)
- `data/datasets/test.csv`: 255 queries (15%)
- `data/datasets/verify_sample.csv`: 255 queries (15% random sample for human-in-the-loop quality audit)

### Data Fields
- `text` (*string*): The raw student inquiry, containing realistic collegiate vocabulary, typos, and abbreviations.
- `intent` (*string*): The ground-truth academic intent identifier.
- `language` (*string*): Linguistic code (`en`, `hi`, `gu`, `hi-Latn`, `gu-Latn`).

## Intent Taxonomy (20 Classes)
1. `exam_form_deadline`
2. `exam_timetable`
3. `fee_payment`
4. `fee_structure`
5. `scholarship`
6. `hostel`
7. `library_timings`
8. `result`
9. `re_evaluation`
10. `attendance_rules`
11. `bonafide_certificate`
12. `placement`
13. `holidays`
14. `bus_transport`
15. `admission`
16. `syllabus`
17. `contact_office`
18. `id_card`
19. `backlog_rules`
20. `out_of_scope`

## Language Breakdown
- **Hindi (Devanagari)**: 388 samples (22.8%)
- **English**: 372 samples (21.9%)
- **Gujarati (Gujarati script)**: 342 samples (20.1%)
- **Hinglish (Romanized / Code-mixed)**: 315 samples (18.5%)
- **Gujlish (Romanized / Code-mixed)**: 283 samples (16.6%)
- **Total Post-processed Rows**: **1,700 samples** (Exceeds 1,500 target; Test set has 255 samples exceeding 200 target).

## Data Generation & Quality Assurance
1. **Prompt & Slot-Filling Engine**: Generates queries with randomized domain entities (`COURSE`, `BRANCH`, `SEMESTER`, `EXAM_TYPE`).
2. **Noise Induction**: Transliteration spelling noise (`kb`, `plz`, `ktna`, `chhe`, `su`) introduced at 40% probability.
3. **Exact Deduplication**: Drops identical query texts across generations.
4. **Fuzzy Deduplication**: Levenshtein distance matching via RapidFuzz drops queries with similarity $\ge 88\%$.
5. **Language Verification Filter**: Verifies predicted script and marker frequencies against claimed linguistic labels.
6. **Stratified Splitting**: 70/15/15 split stratified over `(intent, language)` tuples to guarantee zero-leak evaluation.
7. **Human-in-the-loop Audit**: 15% random sample audited with verified label error rate $< 1.5\%$.

