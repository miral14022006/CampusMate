from typing import Tuple

# Fast phonetic / lexical transliteration map for common academic & conversational queries
HINGLISH_TO_DEVANAGARI = {
    "exam": "परीक्षा", "pariksha": "परीक्षा",
    "form": "फॉर्म",
    "last": "अंतिम", "antim": "अंतिम", "aakhri": "आखिरी",
    "date": "तारीख", "tarikh": "तारीख",
    "deadline": "अंतिम तिथि",
    "kab": "कब", "kya": "क्या", "kaise": "कैसे", "kyun": "क्यों", "kaha": "कहाँ",
    "hai": "है", "hain": "हैं",
    "bharne": "भरने", "bharo": "भरो", "bharna": "भरना",
    "fees": "फीस", "fee": "शुल्क", "shulk": "शुल्क",
    "timetable": "समय सारिणी", "datesheet": "समय सारिणी",
    "holiday": "छुट्टी", "chutti": "छुट्टी", "chhutti": "छुट्टी",
    "hostel": "छात्रावास", "mess": "मेस",
    "result": "परिणाम", "results": "परिणाम",
    "library": "पुस्तकालय", "timing": "समय", "timings": "समय",
    "semester": "सेमेस्टर", "sem": "सेमेस्टर"
}

GUJLISH_TO_GUJARATI = {
    "exam": "પરીક્ષા", "pariksha": "પરીક્ષા",
    "form": "ફોર્મ",
    "last": "છેલ્લી", "chelli": "છેલ્લી", "antim": "અંતિમ",
    "date": "તારીખ", "tarikh": "તારીખ",
    "shu": "શું", "su": "શું",
    "che": "છે", "chhe": "છે",
    "kyaare": "ક્યારે", "kyare": "ક્યારે", "kem": "કેમ",
    "bharvani": "ભરવાની", "bharo": "ભરો",
    "fees": "ફી", "fee": "ફી",
    "timetable": "સમયપત્રક",
    "holiday": "રજા", "chutti": "રજા", "raja": "રજા",
    "hostel": "છાત્રાલય",
    "result": "પરિણામ",
    "library": "પુસ્તકાલય",
    "semester": "સેમેસ્ટર"
}

def transliterate_to_dual_form(query: str, detected_language: str) -> Tuple[str, str]:
    """
    Produce a dual-form query expanding Romanized queries (Hinglish/Gujlish)
    with equivalent Indic script terms for cross-lingual vector and keyword retrieval.
    Returns: (original_query, dual_form_query)
    """
    if detected_language not in ["hinglish", "gujlish"]:
        return query, query

    words = query.split()
    expanded_tokens = list(words)

    if detected_language == "hinglish":
        for w in words:
            clean_w = w.lower().strip("?,.!")
            if clean_w in HINGLISH_TO_DEVANAGARI:
                expanded_tokens.append(HINGLISH_TO_DEVANAGARI[clean_w])
    elif detected_language == "gujlish":
        for w in words:
            clean_w = w.lower().strip("?,.!")
            if clean_w in GUJLISH_TO_GUJARATI:
                expanded_tokens.append(GUJLISH_TO_GUJARATI[clean_w])

    dual_form = " ".join(expanded_tokens)
    return query, dual_form
