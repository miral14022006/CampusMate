import pytest
import os
import sys

sys.path.insert(0, os.path.abspath('nlp-service'))
from features.f19_knowledge.extractors import KnowledgeExtractor, verify_grounding
from features.f19_knowledge.answering import KnowledgeAnswerEngine
from features.f19_knowledge.index import KnowledgeFactIndex

def test_verify_grounding_exact_substring():
    chunk = "The final semester exam will be held on 26.11.2026 for all students."
    quote = "final semester exam will be held on 26.11.2026"
    ans = "The exam date is 26.11.2026"
    valid, reason = verify_grounding(chunk, quote, ans)
    assert valid is True
    assert reason == "OK"

def test_verify_grounding_rejects_hallucinated_number():
    chunk = "The fee is Rs. 5000 payable by Friday."
    quote = "The fee is Rs. 5000"
    ans = "The fee is Rs. 9999"
    valid, reason = verify_grounding(chunk, quote, ans)
    assert valid is False
    assert "9999" in reason

def test_rule_extraction():
    extractor = KnowledgeExtractor()
    chunk = "1 26.11.2026 10.00 am to 01.00 pm 24HS501T Scientific Writing M.Tech - I"
    facts = extractor.extract_from_rules(chunk, "doc1", "Exam Notice", 1)
    assert len(facts) > 0
    f = facts[0]
    assert "26.11.2026" in f["values"]["dates"]
    assert f["status"] == "approved"

def test_knowledge_answer_direct_match():
    engine = KnowledgeAnswerEngine(score_threshold=7.0)
    res = engine.answer_query("When is Scientific Writing exam for M.Tech?")
    assert res["matched"] is True
    assert res["mode"] == "fact"
    assert "26.11.2026" in res["answer"]
    assert len(res["citations"]) > 0

def test_knowledge_answer_negative_rejection():
    engine = KnowledgeAnswerEngine(score_threshold=7.0)
    res = engine.answer_query("What is the hostel swimming pool fee for 2030?")
    assert res["matched"] is False
    assert res["mode"] == "none"
    assert res["decision_reason"] in ["NO_MATCH", "BELOW_FACT_THRESHOLD"]
