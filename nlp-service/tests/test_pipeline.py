import pytest
from app.nlp.language_detection import detect_language
from app.nlp.preprocessing import clean_text, normalize_slang, tokenize, remove_stopwords
from app.nlp.transliteration import transliterate_to_dual_form
from app.nlp.intent_classifier import intent_classifier
from app.nlp.entity_extraction import extract_entities
from app.retrieval.hybrid_retriever import hybrid_retriever
from app.services.chat_service import process_query

def test_language_detection():
    # English
    r1 = detect_language("When is the examination registration deadline?")
    assert r1["language"] == "en"

    # Hindi
    r2 = detect_language("परीक्षा फॉर्म भरने की अंतिम तारीख क्या है?")
    assert r2["language"] == "hi"
    assert r2["script"] == "devanagari"

    # Gujarati
    r3 = detect_language("પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ શું છે?")
    assert r3["language"] == "gu"
    assert r3["script"] == "gujarati"

    # Hinglish
    r4 = detect_language("Exam form bharne ki last date kya hai?")
    assert r4["language"] == "hinglish"

    # Gujlish
    r5 = detect_language("Exam form bharvani last date su che?")
    assert r5["language"] == "gujlish"

def test_preprocessing_and_slang():
    raw = "Exam kb h btado plz???"
    clean = clean_text(raw)
    norm = normalize_slang(clean)
    assert "kab" in norm
    assert "hai" in norm

def test_transliteration_dual_form():
    orig, dual = transliterate_to_dual_form("exam form bharne ki last date kab hai", "hinglish")
    assert "परीक्षा" in dual
    assert "फॉर्म" in dual
    assert "तारीख" in dual

def test_intent_classification():
    res1 = intent_classifier.classify("When is the last date to submit the exam form?")
    assert res1["intent"] == "exam_form_deadline"
    assert res1["confidence"] > 0.3

    res2 = intent_classifier.classify("what is the exam timetable for cse")
    assert res2["intent"] == "exam_timetable"

    res3 = intent_classifier.classify("how to pay semester fees online")
    assert res3["intent"] == "fee_payment"

    res4 = intent_classifier.classify("tell me a joke about cats")
    assert res4["intent"] == "out_of_scope"

def test_entity_extraction():
    entities = extract_entities("Exam timetable for CSE 5th semester on 26.11.2026")
    assert entities["branch"] == "Computer Science and Engineering"
    assert entities["semester"] == 5
    assert "26.11.2026" in entities["dates"]

def test_retrieval_and_rag():
    res = process_query("When is the Scientific Writing and Publication Ethics exam?")
    assert res["grounded"] is True
    assert "24HS501T" in res["answer"] or "26.11.2026" in res["answer"] or "November 26" in res["answer"]
    assert len(res["citations"]) > 0
    assert "FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf" in res["source_doc"]
