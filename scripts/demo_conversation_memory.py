#!/usr/bin/env python3
"""
Feature 06 Demo: Multi-turn Conversation Memory, Slot Inheritance & Override,
Elliptical Query Rewriting, and Session Reset across 3 languages (English, Hinglish, Gujarati).
"""
import sys
from pathlib import Path

NLP_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
sys.path.insert(0, str(NLP_DIR))

from features.f06_dialogue_state.manager import DialogueManager

def run_dialogue(title: str, turns: list, dm: DialogueManager):
    print("=" * 80)
    print(f"  {title}")
    print("=" * 80)

    state = None
    for i, t in enumerate(turns, 1):
        print(f"\n[Turn {i}] User: \"{t['query']}\"")
        res = dm.process_turn(
            query=t["query"],
            incoming_state=state,
            detected_intent=t["intent"],
            intent_confidence=t["conf"],
            entities=t.get("entities", [])
        )
        state = res["updated_state"]

        if res["is_reset"]:
            print("  🔄 ACTION: Session Reset Triggered! Dialogue memory cleared.")
        elif res["is_follow_up"]:
            print(f"  🔄 ACTION: Follow-up Detected! (Inherited Intent: '{res['resolved_intent']}')")
            print(f"  🔍 REWRITTEN QUERY: \"{res['standalone_query']}\"")
        else:
            print(f"  ➡️ ACTION: New Context Initiated. (Intent: '{res['resolved_intent']}')")

        active_slots = {k: v for k, v in state.get("slots", {}).items() if v}
        print(f"  📦 ACTIVE DIALOGUE SLOTS: {active_slots}")

def main():
    dm = DialogueManager()

    # Dialogue 1: English Multi-turn
    turns_en = [
        {
            "query": "What is the exam timetable for B.Tech CS 3rd sem?",
            "intent": "exam_timetable",
            "conf": 0.94,
            "entities": [{"label": "COURSE_NAME", "text": "B.Tech CS"}, {"label": "SEMESTER", "text": "3rd sem"}]
        },
        {
            "query": "and for 5th sem?",
            "intent": "out_of_scope",
            "conf": 0.25,
            "entities": [{"label": "SEMESTER", "text": "5th sem"}]
        },
        {
            "query": "new topic",
            "intent": "greeting",
            "conf": 0.90,
            "entities": []
        }
    ]
    run_dialogue("DIALOGUE 1: ENGLISH (EXAM TIMETABLE & SEMESTER OVERRIDE)", turns_en, dm)

    # Dialogue 2: Hinglish Multi-turn
    turns_hi = [
        {
            "query": "B.Tech IT ki semester fee schedule kya hai?",
            "intent": "fee_payment_dates",
            "conf": 0.92,
            "entities": [{"label": "COURSE_NAME", "text": "B.Tech IT"}]
        },
        {
            "query": "aur hostel fees ke liye?",
            "intent": "out_of_scope",
            "conf": 0.35,
            "entities": []
        },
        {
            "query": "reset karo",
            "intent": "greeting",
            "conf": 0.85,
            "entities": []
        }
    ]
    run_dialogue("DIALOGUE 2: HINGLISH (FEE SCHEDULE & HOSTEL OVERRIDE)", turns_hi, dm)

    # Dialogue 3: Gujarati Multi-turn
    turns_gu = [
        {
            "query": "Mechanical Engineering 4th sem નો સિલેબસ શું છે?",
            "intent": "syllabus_structure",
            "conf": 0.91,
            "entities": [{"label": "BRANCH", "text": "Mechanical"}, {"label": "SEMESTER", "text": "4th sem"}]
        },
        {
            "query": "અને 6th sem માટે?",
            "intent": "out_of_scope",
            "conf": 0.20,
            "entities": [{"label": "SEMESTER", "text": "6th sem"}]
        }
    ]
    run_dialogue("DIALOGUE 3: GUJARATI (SYLLABUS & SEMESTER INHERITANCE)", turns_gu, dm)

if __name__ == "__main__":
    main()

