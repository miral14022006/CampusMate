import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("nlp_service.calendar_classifier")

def load_title_templates() -> Dict[str, Any]:
    candidates = [
        Path(__file__).parent.parent.parent / "data" / "templates" / "calendar_titles.json",
        Path(__file__).parent.parent.parent.parent / "data" / "templates" / "calendar_titles.json"
    ]
    for p in candidates:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading calendar_titles.json from {p}: {e}")
    return {"categories": {}, "intents": {}}

TITLE_TEMPLATES = load_title_templates()

KEYWORD_CATEGORY_MAP = [
  (["exam", "pariksha", "परीक्षा", "પરીક્ષા", "timetable", "schedule", "hall ticket", "re-evaluation", "re-checking", "atkt", "backlog"], "exam"),
  (["fee", "fees", "shulk", "शुल्क", "ફી", "फीस", "फी", "challan", "payment", "tuition", "fine", "penalty"], "fee"),
  (["admission", "pravesh", "प्रवेश", "cutoff", "allotment", "seat", "merit", "counseling"], "admission"),
  (["holiday", "vacation", "chutti", "छुट्टी", "अवकाश", "रजा", "રજા", "diwali", "republic", "independence"], "holiday"),
  (["result", "grade", "marksheet", "cgpa", "sgpa", "परिणाम", "પરિણામ"], "result")
]

INTENT_CATEGORY_MAP = {
  "exam_form_deadline": "exam",
  "exam_timetable": "exam",
  "fee_payment": "fee",
  "fee_structure": "fee",
  "admission": "admission",
  "holidays": "holiday",
  "result": "result",
  "re_evaluation": "exam",
  "hostel": "fee"
}

def classify_event_category(snippet: str, intent: Optional[str] = None) -> str:
    """
    Maps sentence snippet and intent to category: exam, fee, admission, holiday, result, other.
    """
    snippet_lower = snippet.lower()
    
    # 1. Check strong intent mapping
    if intent and intent in INTENT_CATEGORY_MAP:
        return INTENT_CATEGORY_MAP[intent]

    # 2. Check keyword mapping
    for keywords, category in KEYWORD_CATEGORY_MAP:
        if any(kw in snippet_lower for kw in keywords):
            return category

    return "other"

def generate_event_titles(category: str, intent: Optional[str] = None, semester: Optional[str] = None, course: Optional[str] = None) -> Dict[str, str]:
    """
    Builds language-specific event titles from templates, appending semester/course entities when available.
    Never uses LLM-invented titles.
    """
    intents_dict = TITLE_TEMPLATES.get("intents", {})
    categories_dict = TITLE_TEMPLATES.get("categories", {})

    base_titles = None
    if intent and intent in intents_dict:
        base_titles = intents_dict[intent]
    elif category in categories_dict:
        base_titles = categories_dict[category]
    else:
        base_titles = categories_dict.get("other", {
            "en": "Important Academic Milestone",
            "hi": "महत्वपूर्ण शैक्षणिक समयसीमा",
            "gu": "મહત્વપૂર્ણ શૈક્ષણિક સમયસીમા"
        })

    en_title = base_titles.get("en", "Important Academic Milestone")
    hi_title = base_titles.get("hi", "महत्वपूर्ण शैक्षणिक समयसीमा")
    gu_title = base_titles.get("gu", "મહત્વપૂર્ણ શૈક્ષણિક સમયસીમા")

    details_suffix_en = []
    details_suffix_hi = []
    details_suffix_gu = []

    if semester:
        details_suffix_en.append(f"Sem {semester}")
        details_suffix_hi.append(f"सेमेस्टर {semester}")
        details_suffix_gu.append(f"સેમેસ્ટર {semester}")

    if course:
        details_suffix_en.append(course.upper())
        details_suffix_hi.append(course.upper())
        details_suffix_gu.append(course.upper())

    if details_suffix_en:
        en_title = f"{en_title} ({' - '.join(details_suffix_en)})"
        hi_title = f"{hi_title} ({' - '.join(details_suffix_hi)})"
        gu_title = f"{gu_title} ({' - '.join(details_suffix_gu)})"

    return {
        "en": en_title,
        "hi": hi_title,
        "gu": gu_title
    }
