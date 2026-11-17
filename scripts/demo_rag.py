#!/usr/bin/env python3
"""
Feature 04 Demo: Demonstrating Grounded RAG with Citations,
Evidence Strength Gating, Hallucination Guard, and Expandable Sources.
"""
import sys
from pathlib import Path

NLP_DIR = Path(__file__).resolve().parent.parent / "nlp-service"
sys.path.insert(0, str(NLP_DIR))

from features.f04_rag.engine import RAGEngine

def main():
    engine = RAGEngine(min_evidence_score=0.01)

    print("=" * 80)
    print("  FEATURE 04 DEMO: GROUNDED RAG WITH CITATIONS & HALLUCINATION GUARD")
    print("=" * 80)

    # Scenario 1: Grounded answer with verified citations
    chunks_1 = [
        {
            "doc_name": "01_exam_notice_en.txt",
            "page": 1,
            "upload_date": "2024-05-15",
            "score": 0.88,
            "text": "The deadline for Mid-Semester exam form submission without late fee is 25th October 2024. A late fee of ₹500 applies until 30th October 2024."
        }
    ]
    print("\n--- Scenario 1: Answerable Query (Grounded Answer with In-text Citations) ---")
    q1 = "What is the last date to submit the exam form?"
    print(f"Query: \"{q1}\"")
    r1 = engine.generate_answer(
        query=q1,
        retrieved_chunks=chunks_1,
        language="en",
        mock_llm_response="The last date for exam form submission without late fee is 25th October 2024, with a late fee of ₹500 applicable until 30th October 2024 [1]."
    )
    print(f"Mode: \033[1;32m{r1.mode.upper()}\033[0m | Grounded: {r1.grounded} | Hallucination Score: {r1.hallucination_score}")
    print(f"Answer:\n{r1.answer}")
    print(f"Verified Citations ({len(r1.citations)}):")
    for c in r1.citations:
        print(f"  [{c.citation_id}] 📄 {c.doc_name} (Page {c.page}, Upload: {c.upload_date})")
        print(f"      Snippet: \"{c.snippet[:80]}...\"")

    # Scenario 2: Unanswerable query - Evidence Gate Triggers Multilingual IDK
    print("\n--- Scenario 2: Unanswerable Query (Evidence Strength Gate Triggered) ---")
    q2 = "कॉलेज में स्विमिंग पूल की फीस कितनी है?"
    print(f"Query (Hindi): \"{q2}\"")
    r2 = engine.generate_answer(
        query=q2,
        retrieved_chunks=[{"doc_name": "general.txt", "score": 0.002, "text": "Library open from 8am to 8pm."}],
        language="hi"
    )
    print(f"Mode: \033[1;33m{r2.mode.upper()}\033[0m (Gate safely avoided hallucination)")
    print(f"Answer:\n{r2.answer}")

    # Scenario 3: Hallucination Attempt Intercepted by Verifier
    print("\n--- Scenario 3: Hallucination Guard Intercepting Invented Numbers/Dates ---")
    q3 = "What are the hostel mess charges?"
    print(f"Query: \"{q3}\"")
    r3 = engine.generate_answer(
        query=q3,
        retrieved_chunks=[{
            "doc_name": "04_hostel_rules_hi.txt",
            "page": 1,
            "upload_date": "2024-04-10",
            "score": 0.85,
            "text": "मेस शुल्क 3,500 रुपये प्रति माह है।"
        }],
        language="en",
        mock_llm_response="The hostel mess fees are ₹12000 per semester payable by 15th December 2025 [1]." # Hallucinated numbers
    )
    print(f"Mode: \033[1;31m{r3.mode.upper()}\033[0m (Fell back to extractive due to hallucination)")
    print(f"Grounded: {r3.grounded} | Hallucination Score: {r3.hallucination_score}")
    print(f"Unsupported Facts Detected: {r3.verification_details.get('unsupported_facts')}")

    print("\n" + "=" * 80)
    print("Demo completed successfully.")
    print("=" * 80)

if __name__ == "__main__":
    main()

