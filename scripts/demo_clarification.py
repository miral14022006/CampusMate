#!/usr/bin/env python3
"""
Feature 05 Demo: Interactive demonstration of confidence-based decisions,
multilingual clarification, missing entity slot prompts, and contact fallback routing.
"""
import sys
import json
from pathlib import Path

NLP_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
sys.path.insert(0, str(NLP_DIR))

from features.f05_clarification.policy import DecisionPolicy

def main():
    policy = DecisionPolicy(t_high=0.55, t_low=0.25, margin_threshold=0.15)

    test_scenarios = [
        {
            "title": "Scenario 1: High Confidence Direct Answer (English)",
            "query": "What is the deadline for submitting the semester examination form?",
            "top_intents": [{"intent": "exam_form_deadline", "confidence": 0.94}],
            "entities": [],
            "chunks": [{"doc": "exam_regulations.txt", "score": 0.82}],
            "lang": "en"
        },
        {
            "title": "Scenario 2: Ambiguous Competing Intents (Hinglish Clarification)",
            "query": "Form submit kab karna hai aur fees kitni hai?",
            "top_intents": [
                {"intent": "exam_form_deadline", "confidence": 0.48},
                {"intent": "fee_payment_dates", "confidence": 0.44}
            ],
            "entities": [],
            "chunks": [{"doc": "fee_schedule.txt", "score": 0.40}],
            "lang": "hi-Latn"
        },
        {
            "title": "Scenario 3: Missing Required Slot (Gujarati Timetable Query)",
            "query": "પરીક્ષાનું ટાઈમટેબલ ક્યારે આવશે?",
            "top_intents": [{"intent": "exam_timetable", "confidence": 0.88}],
            "entities": [],  # Missing SEMESTER
            "chunks": [{"doc": "exam_schedule.txt", "score": 0.70}],
            "lang": "gu"
        },
        {
            "title": "Scenario 4: Out of Scope / Low Confidence (Hindi Fallback with Office Contact)",
            "query": "कॉलेज में स्विमिंग पूल की फीस कितनी है?",
            "top_intents": [{"intent": "out_of_scope", "confidence": 0.18}],
            "entities": [],
            "chunks": [],
            "lang": "hi"
        }
    ]

    print("=" * 80)
    print("  FEATURE 05 DEMO: CONFIDENCE FALLBACK & CLARIFICATION POLICY")
    print("=" * 80)

    for i, scen in enumerate(test_scenarios, 1):
        print(f"\n--- {scen['title']} ---")
        print(f"Query: \"{scen['query']}\"")
        print(f"Language: {scen['lang']}")
        print(f"Top Intent(s): {[(t['intent'], t['confidence']) for t in scen['top_intents']]}")

        res = policy.evaluate(
            top_intents=scen["top_intents"],
            entities=scen["entities"],
            retrieved_chunks=scen["chunks"],
            language=scen["lang"]
        )

        print(f"Decision: \033[1;32m{res['decision']}\033[0m" if res['decision'] == 'ANSWER'
              else f"Decision: \033[1;33m{res['decision']}\033[0m" if res['decision'] == 'CLARIFY'
              else f"Decision: \033[1;31m{res['decision']}\033[0m")
        print(f"Reason: {res['reason']}")

        if res["clarification_question"]:
            print(f"\nAssistant Response / Prompt:\n{res['clarification_question']}")

        if res["quick_replies"]:
            print(f"\nQuick-Reply Interactive Options:")
            for qr in res["quick_replies"]:
                print(f"  [👉 {qr['label']} (payload: {qr['payload']})]")

        if res["contact_info"]:
            print(f"\nRouted Office Contact Card:")
            print(f"  🏢 {res['contact_info']['name']}")
            print(f"  📍 {res['contact_info']['room']}")
            print(f"  📞 {res['contact_info']['phone']} | ✉️ {res['contact_info']['email']}")

    print("\n" + "=" * 80)
    print("Demo completed successfully.")
    print("=" * 80)

if __name__ == "__main__":
    main()

