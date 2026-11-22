import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Campus/college specific indicator terms across scripts (English, Hindi, Gujarati, Hinglish, Gujlish)
CAMPUS_INDICATORS = [
    # English
    "fee", "fees", "hostel", "mess", "timetable", "time table", "exam", "exams",
    "examination", "circular", "semester", "sem", "pdeu", "pdpu", "hall ticket",
    "admit card", "holiday", "holidays", "academic calendar", "registration",
    "result", "results", "spi", "cpi", "cgpa", "course code", "warden",
    "club", "president", "professor", "hod", "department", "campus", "college",
    "swimming", "pool", "library", "canteen", "sports", "rangtaal", "flare", "tesseract",
    "admission", "scholarship", "convocation", "attendance", "grade", "credits",
    "placement", "internship", "faculty", "syllabus", "midsem", "endsem",

    # Hindi (Devanagari)
    "फीस", "शुल्क", "होस्टल", "हॉस्टल", "मेस", "परीक्षा", "समय सारिणी", "तारीख", 
    "कैलेंडर", "अवकाश", "छुट्टी", "छुट्टियां", "रजिस्ट्रेशन", "नतीजा", "परिणाम", 
    "महाविद्यालय", "कॉलेज", "परिसर", "पुस्तकालय", "छात्रवृत्ति", "प्रवेश", "रंगताल",

    # Gujarati (Gujarati Script)
    "સ્વિમિંગ", "પુલ", "ફી", "હોસ્ટેલ", "મેસ", "પરીક્ષા", "સમયપત્રક", "તારીખ", "તારીખો",
    "કેલેન્ડર", "રજા", "રજાઓ", "નોંધણી", "પરિણામ", "કોલેજ", "કેમ્પસ", "પુસ્તકાલય",
    "વિષય", "વિષયો", "બધા વિષય", "વિભાગ", "રંગતાલ",

    # Hinglish & Gujlish (Romanized)
    "chhutti", "chhuttiya", "pariksha", "samaypatrak", "dakhla", "nodhni", "vidhyarthi"
]

# Greetings & pleasantries
CONVERSATIONAL_TRIGGERS = [
    "hi", "hello", "hey", "hola", "namaste", "kem cho", "kem chho", "how are you", 
    "who are you", "what can you do", "good morning", "good evening", "good afternoon",
    "thank you", "thanks", "dhanyawad", "aabhar", "shukriya", "bye", "goodbye", "alvida",
    "help", "who created you", "what is your name", "kya haal hai", "majama"
]

# General knowledge and technical keywords
GENERAL_KEYWORDS = [
    "object oriented", "oop", "rest api", "restful", "tcp", "udp", "ip address",
    "machine learning", "deep learning", "neural network", "recursion",
    "binary search", "data structure", "algorithm", "sorting", "merge sort",
    "quick sort", "database", "sql", "nosql", "docker", "kubernetes",
    "operating system", "deadlock", "semaphore", "compiler", "microservice",
    "git", "github", "http", "https", "python", "javascript", "react", "html", "css",
    "c++", "java", "golang", "rust", "typescript", "linux", "cloud computing",
    "computer", "कम्प्यूटर", "कंप्यूटर", "કમ્પ્યુટર", "કમ્પ્યૂટર",
    "moon", "चन्द्रमा", "चाँद", "ચંદ્ર", "earth", "पृथ्वी", "sun", "space", "science",
    "history", "geography", "gravity", "quantum", "relativity", "photosynthesis",
    "dna", "rna", "atom", "molecule", "solar system", "black hole",
    "capital of", "who is", "who was", "president of", "prime minister of"
]

# General prompt questions/triggers
GENERAL_PROMPT_TRIGGERS = [
    "what is", "explain", "define", "difference between", "how does", "compare",
    "give example", "what are", "who was", "who is", "where is", "when was",
    "can you explain", "tell me about", "tell me a", "write a", "how to learn",
    "how to solve", "how to write", "how to create", "how to implement",
    "क्या है", "ક્યાં છે", "શું છે", "કોણ છે", "સમજાવો", "વિશે જણાવો",
    "kya hai", "su che", "kem hoy", "samjhao", "batao", "bataye"
]


def is_general_concept_query(query: str) -> bool:
    """
    Classifies whether a query is a general concept/knowledge/chat inquiry
    or a college/campus-specific document retrieval question.
    Returns True for general queries, False for campus inquiries.
    """
    if not query:
        return False

    q_low = re.sub(r"[^\w\s\u0900-\u097F\u0A80-\u0AFF]", " ", query.lower())
    q_low = re.sub(r"\s+", " ", q_low).strip()

    # 1. If explicit campus indicators exist, prioritize campus retrieval
    for ci in CAMPUS_INDICATORS:
        if re.search(r"\b" + re.escape(ci) + r"\b", q_low, re.IGNORECASE):
            return False

    # 2. Conversational greetings/pleasantries
    for ct in CONVERSATIONAL_TRIGGERS:
        if re.search(r"\b" + re.escape(ct) + r"\b", q_low, re.IGNORECASE):
            return True

    # 3. Known general knowledge and tech keywords
    for kw in GENERAL_KEYWORDS:
        if re.search(r"\b" + re.escape(kw) + r"\b", q_low, re.IGNORECASE):
            return True

    # 4. Prompt triggers without any campus keywords
    for tr in GENERAL_PROMPT_TRIGGERS:
        if re.search(r"\b" + re.escape(tr) + r"\b", q_low, re.IGNORECASE):
            return True

    # 5. Very short queries (<= 3 words) with no campus keywords (e.g. "gravity", "computer", "hello friend")
    words = q_low.split()
    if len(words) <= 3:
        return True

    return False
