#!/usr/bin/env python3
"""
Feature 07 Demo:
Tests the production REST API with authentication, request ID correlation,
and queries both /v1/query and /v1/analyze.
"""
import sys
import json
from pathlib import Path
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "nlp-service"))

from app.main import app
from app.core.config import NLP_API_KEY, API_KEY_HEADER_NAME

def main():
    client = TestClient(app)
    headers = {API_KEY_HEADER_NAME: NLP_API_KEY}

    print("=" * 75)
    print(" FEATURE 07: PRODUCTION REST API DEMONSTRATION")
    print("=" * 75)

    # 1. Health & Version
    v_res = client.get("/v1/version").json()
    print(f"\n[1] GET /v1/version -> Version: {v_res['version']} | Active Features: {v_res['active_features']}")

    # 2. POST /v1/query
    test_query = "Exam form bharne ki last date kab hai bhai late fees lagegi kya?"
    print(f"\n[2] POST /v1/query -> Query: \"{test_query}\"")
    q_res = client.post("/v1/query", json={"query": test_query}, headers=headers)
    data = q_res.json()
    print(f"    ✔ Request ID: {data['request_id']}")
    print(f"    ✔ Detected Language: {data['language']}")
    print(f"    ✔ Intent: {data['intent']} (Confidence: {data['confidence']})")
    print(f"    ✔ Answer: \"{data['answer']}\"")
    print(f"    ✔ Source Document: {data['source_doc']}")
    print(f"    ✔ Total Execution Latency: {data['execution_time_ms']} ms")

    # 3. POST /v1/analyze (Intermediate only)
    print(f"\n[3] POST /v1/analyze (Inspect intermediate pipeline stages without answer)")
    a_res = client.post("/v1/analyze", json={"query": "What is the fee for BTech Computer Engineering?"}, headers=headers)
    a_data = a_res.json()
    print(f"    ✔ Stage Latencies (ms): {a_data['stage_latencies_ms']}")
    print(f"    ✔ Extracted Entities: {a_data['entities']}")
    print(f"    ✔ Retrieved Chunks: {len(a_data['retrieved_chunks'])} top passages")

    # 4. GET /v1/metrics
    m_res = client.get("/v1/metrics").json()
    print(f"\n[4] GET /v1/metrics -> Total Queries: {m_res['total_queries']} | Avg Latency: {m_res['average_latency_ms']} ms")

    print("\n" + "=" * 75)
    print(" [OK] Feature 07 REST API Demo Successfully Executed.")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    main()

