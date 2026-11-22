#!/usr/bin/env python3
"""
CLI tool for running student queries through the baseline NLP pipeline.
Usage: python nlp-service/cli.py "Exam form bharne ki last date kya hai?"
"""
import sys
from pathlib import Path

# Add nlp-service to path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from app.pipeline import pipeline

def run_cli(query_text: str):
    print("=" * 80)
    print(f" Query: {query_text}")
    print("=" * 80)

    result = pipeline.process(query_text)

    print(f" [1] Language:    {result.detected_language} (Script: {result.script}, Confidence: {result.language_confidence:.2f})")
    print(f" [2] Intent:      {result.intent} (Confidence: {result.intent_confidence:.3f}, Fallback: {result.is_fallback_intent})")
    print(f" [3] Entities:    {[{'label': e.label, 'text': e.text} for e in result.entities]}")
    print(f" [4] Top Sources: {[{'doc': c.doc_name, 'score': c.score} for c in result.retrieved_chunks[:2]]}")
    print(f" [5] Answer:      \n  -> \"{result.answer}\"")
    print(f" [6] Source Doc:  {result.source_doc}")
    print(f" [7] Latency:     {result.execution_time_ms} ms")
    print("=" * 80)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        query = "Exam form bharne ki last date kya hai?"
        print(f"No query provided, using default demo query: '{query}'")
    else:
        query = " ".join(sys.argv[1:])

    run_cli(query)

