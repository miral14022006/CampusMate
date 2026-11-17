#!/usr/bin/env python3
"""
Runnable End-to-End Demo showcasing 5 sample queries across all 5 language styles:
1. English
2. Hindi
3. Gujarati
4. Hinglish (code-mixed)
5. Gujlish (code-mixed)
"""
import sys
from pathlib import Path

# Add nlp-service to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root / "nlp-service"))

from app.pipeline import pipeline

SAMPLE_QUERIES = [
    {
        "language_style": "English (en)",
        "query": "What is the fee structure for BTech Computer Engineering?"
    },
    {
        "language_style": "Hindi (hi)",
        "query": "कॉलेज में छात्रावास मेस का खाना और नियम क्या हैं?"
    },
    {
        "language_style": "Gujarati (gu)",
        "query": "સેન્ટ્રલ લાઈબ્રેરીનો સમય શું છે અને પુસ્તકો કેવી રીતે ઈશ્યુ કરાવી શકાય?"
    },
    {
        "language_style": "Hinglish (hi-Latn)",
        "query": "Exam form bharne ki last date kab hai bhai late fees lagegi kya?"
    },
    {
        "language_style": "Gujlish (gu-Latn)",
        "query": "College ma admission mate ketli fees chhe ane form kyare aavshe?"
    }
]

def main():
    print("\n" + "=" * 85)
    print(" MULTILINGUAL COLLEGE ASSISTANT - BASELINE FOUNDATION END-TO-END DEMO")
    print("=" * 85)

    for idx, item in enumerate(SAMPLE_QUERIES, 1):
        style = item["language_style"]
        q = item["query"]
        print(f"\n[{idx}] Testing Language Style: {style}")
        print(f"    User Query: \"{q}\"")

        result = pipeline.process(q)

        print(f"    ✔ Detected Language : {result.detected_language} (Script: {result.script}, Conf: {result.language_confidence:.2f})")
        print(f"    ✔ Predicted Intent  : {result.intent} (Conf: {result.intent_confidence:.3f})")
        if result.entities:
            print(f"    ✔ Extracted Entities: {[{'type': e.label, 'val': e.text} for e in result.entities]}")
        else:
            print(f"    ✔ Extracted Entities: None")
        print(f"    ✔ Source Document   : {result.source_doc}")
        print(f"    ✔ System Response   : \"{result.answer}\"")
        print(f"    ✔ Inference Latency : {result.execution_time_ms} ms")
        print("-" * 85)

    print("\n[OK] All 5 language style queries processed cleanly through the pipeline.")
    print("=" * 85 + "\n")

if __name__ == "__main__":
    main()

