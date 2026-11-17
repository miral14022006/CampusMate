#!/usr/bin/env python3
"""
Feature 03 Demo:
Interactive and standalone demo comparing Baseline vs MuRIL Transformer
intent classification with temperature-calibrated probabilities and top-3 rankings.
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "nlp-service"))

from app.modules.intent_baseline import intent_classifier as baseline_clf
from features.f03_transformer_intent.inference import muril_classifier

DEMO_QUERIES = [
    ("English", "What is the tuition fee structure for BTech Computer Engineering?"),
    ("Hindi", "हॉस्टल में मेस का खाना और नियम क्या हैं?"),
    ("Gujarati", "સેન્ટ્રલ લાઈબ્રેરીનો સમય શું છે અને પુસ્તકો કેવી રીતે ઈશ્યુ કરાવી શકાય?"),
    ("Hinglish", "Exam form bharne ki last date kab hai late fees lagegi kya?"),
    ("Gujlish", "College ma admission mate ketli fees chhe ane form kyare aavshe?")
]

def main():
    print("=" * 85)
    print(" FEATURE 03: TRANSFORMER INTENT CLASSIFIER DEMO (Google MuRIL)")
    print("=" * 85)

    for dialect, q in DEMO_QUERIES:
        b_res = baseline_clf.predict(q)
        m_res = muril_classifier.predict(q)

        print(f"\n[{dialect}]: \"{q}\"")
        print(f" -> Baseline (TF-IDF+LR)  : Intent: {b_res['intent'].ljust(22)} | Conf: {b_res['confidence']:.3f}")
        print(f" -> MuRIL Transformer     : Intent: {m_res['intent'].ljust(22)} | Calibrated Conf: {m_res['confidence']:.3f}")
        print(f"    Top 3 Predictions     : {[{item['intent']: item['score']} for item in m_res.get('top3', [])]}")
        print("-" * 85)

    print("\n[OK] Feature 03 Transformer Intent Demo Successfully Completed.")
    print("=" * 85 + "\n")

if __name__ == "__main__":
    main()

