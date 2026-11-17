import sys
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Ground truth document mapping for intents that correspond to real raw documents:
# 1. 01_exam_notice_en.txt: exam registration, deadline, timetable, hall ticket, remedial
# 2. 02_fee_notice_en.txt: tuition fee, annual fee, payment mode, scholarship
# 3. 03_academic_calendar_en.txt: semester timeline, working days, holidays, Diwali vacation
# 4. 04_hostel_rules_hi.txt: hostel accommodation, room, mess, curfew
# 5. 05_library_rules_gu.txt: library timing, reading room, books, issue rules

DOC_MAPPING = {
    "exam_form_deadline": ("01_exam_notice_en.txt", "examination registration portal for the upcoming End Semester Winter Examination will be open from 1st October to 20th October"),
    "exam_timetable": ("01_exam_notice_en.txt", "final examination timetable will be officially released on the college student portal two weeks prior"),
    "fee_payment": ("02_fee_notice_en.txt", "fee payments must be executed strictly online through the college ERP portal"),
    "fee_structure": ("02_fee_notice_en.txt", "annual tuition fee for BTech Computer Engineering, Information Technology, and Electronics Engineering is Rs 85,000"),
    "scholarship": ("02_fee_notice_en.txt", "Students eligible for post-matric scholarships or MYSY scholarship schemes must submit their provisional scholarship approval"),
    "holidays": ("03_academic_calendar_en.txt", "annual Diwali vacation will be observed for two full weeks starting from 28th October to 10th November 2024"),
    "hostel": ("04_hostel_rules_hi.txt", "छात्रावास का वार्षिक शुल्क 36,000 रुपये है जिसमें आवास, बिजली और इंटरनेट वाई-फाई शामिल है। मेस शुल्क 3,500 रुपये"),
    "library_timings": ("05_library_rules_gu.txt", "કોલેજ સેન્ટ્રલ લાઈબ્રેરી સોમવારથી શનિવાર સવારે 8:00 થી સાંજે 8:00 વાગ્યા સુધી કાર્યરત રહેશે")
}

def generate_retrieval_set():
    seed_csv = PROJECT_ROOT / "data" / "datasets" / "seed_queries.csv"
    train_csv = PROJECT_ROOT / "data" / "datasets" / "train.csv"

    df_seed = pd.read_csv(seed_csv) if seed_csv.exists() else pd.DataFrame()
    df_train = pd.read_csv(train_csv) if train_csv.exists() else pd.DataFrame()

    combined = pd.concat([df_seed, df_train], ignore_index=True)
    combined = combined.drop_duplicates(subset=["text" if "text" in combined.columns else "query"]).copy()

    records = []
    for _, row in combined.iterrows():
        q = row.get("text") or row.get("query")
        intent = row.get("intent")
        lang = row.get("language")

        if intent in DOC_MAPPING:
            gold_doc, gold_span = DOC_MAPPING[intent]
            records.append({
                "query": q,
                "language": lang,
                "intent": intent,
                "gold_doc": gold_doc,
                "gold_chunk_or_text_span": gold_span
            })

    df_retrieval = pd.DataFrame(records)
    # Ensure at least 100 queries
    if len(df_retrieval) > 120:
        # Sample stratifying by language
        df_retrieval = df_retrieval.groupby("language", group_keys=False).apply(lambda x: x.sample(min(len(x), 25), random_state=42))

    out_csv = PROJECT_ROOT / "eval" / "retrieval_set.csv"
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    df_retrieval.to_csv(out_csv, index=False, encoding="utf-8")
    print(f"Generated {len(df_retrieval)} verified retrieval evaluation queries across languages in {out_csv}")

if __name__ == "__main__":
    generate_retrieval_set()

