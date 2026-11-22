import re
import logging
from typing import List, Dict, Any, Optional, Tuple

from features.f15_calendar_events.classifier import classify_event_category, generate_event_titles

logger = logging.getLogger("nlp_service.calendar_extractor")

# Multilingual Month Lexicons (English, Hindi, Gujarati, Hinglish transliterations)
MONTH_LEXICON = {
    # English
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,

    # Hindi month names (Devanagari)
    "जनवरी": 1, "फ़रवरी": 2, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4, "मई": 5, "जून": 6,
    "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9, "अक्टूबर": 10, "अक्तूबर": 10,
    "नवंबर": 11, "नवम्बर": 11, "दिसंबर": 12, "दिसम्बर": 12,

    # Gujarati (Gujarati Script)
    "જાન્યુઆરી": 1, "ફેબ્રુઆરી": 2, "માર્ચ": 3, "એપ્રિલ": 4, "મે": 5, "જૂન": 6,
    "જુલાઈ": 7, "ઓગસ્ટ": 8, "સપ્ટેમ્બર": 9, "ઓક્ટોબર": 10, "ઓકટોબર": 10,
    "નવેમ્બર": 11, "ડિસેમ્બર": 12
}

RELATIVE_WORDS = [
    "tomorrow", "yesterday", "today", "tonight", "next week", "last week", "kal", "aaj", "parson",
    "આજે", "કાલે", "આવતીકાલે", "ગઈકાલે", "कल", "आज"
]

SEMESTER_PATTERN = re.compile(r'(?:semester|sem|સેમેસ્ટર|સેમ|सेमेस्टर|सेम)\s*([1-8IVX]+)', re.IGNORECASE)
COURSE_PATTERN = re.compile(r'\b(b\.?tech|m\.?tech|mba|bba|b\.?sc|m\.?sc|phd|diploma)\b', re.IGNORECASE)

# Build regex pattern for month names
ALL_MONTHS_PATTERN = "|".join(re.escape(k) for k in sorted(MONTH_LEXICON.keys(), key=len, reverse=True))

# 1. Date Range Patterns
# E.g.: "10 to 20 Dec 2026", "10-20 Dec 2026", "10th to 15th November 2026", "10 થી 20 ડિસેમ્બર 2026", "10 से 15 नवंबर 2026"
RANGE_PATTERN_1 = re.compile(
    rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s*(?:to|through|until|till|-|–|—|से|થી)\s*(\d{{1,2}})(?:st|nd|rd|th)?\s+({ALL_MONTHS_PATTERN})(?:\s*,?\s*(\d{{4}}))?\b',
    re.IGNORECASE
)

# E.g.: "10 Dec to 20 Dec 2026", "10 Nov 2026 - 15 Nov 2026"
RANGE_PATTERN_2 = re.compile(
    rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({ALL_MONTHS_PATTERN})(?:\s*,?\s*(\d{{4}}))?\s*(?:to|through|until|till|-|–|—|से|થી)\s*(\d{{1,2}})(?:st|nd|rd|th)?\s+({ALL_MONTHS_PATTERN})(?:\s*,?\s*(\d{{4}}))?\b',
    re.IGNORECASE
)

# E.g.: Numeric Range "10/12/2026 to 15/12/2026", "10-12-2026 - 15-12-2026"
RANGE_PATTERN_NUMERIC = re.compile(
    r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(?:to|through|until|till|-|–|—|से|થી)\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b'
)

# 2. Single Date Patterns
# Numeric dates: 25/11/2026, 25-11-2026, 2026-11-25
NUMERIC_DATE_DMY = re.compile(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b')
NUMERIC_DATE_YMD = re.compile(r'\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b')

# Text month dates: "25th November 2026", "25 Nov", "November 25, 2026", "२५ नवंबर २०२६"
TEXT_DATE_DMY = re.compile(
    rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({ALL_MONTHS_PATTERN})(?:\s*,?\s*(\d{{4}}))?\b',
    re.IGNORECASE
)
TEXT_DATE_MDY = re.compile(
    rf'\b({ALL_MONTHS_PATTERN})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{{4}}))?\b',
    re.IGNORECASE
)

def _normalize_digits(s: str) -> str:
    """Normalizes Devanagari and Gujarati numerals to ASCII 0-9."""
    devanagari_digits = "०१२३४५६७८९"
    gujarati_digits = "૦૧૨૩૪૫૬૭૮૯"
    trans_table = {}
    for i in range(10):
        trans_table[ord(devanagari_digits[i])] = ord(str(i))
        trans_table[ord(gujarati_digits[i])] = ord(str(i))
    return s.translate(trans_table)

def _parse_month(month_str: str) -> Optional[int]:
    clean = month_str.strip().lower()
    return MONTH_LEXICON.get(clean)

def _is_relative_expression(snippet: str) -> bool:
    s_lower = snippet.lower()
    for rel in RELATIVE_WORDS:
        if re.search(rf'\b{re.escape(rel)}\b', s_lower):
            return True
    return False

def _extract_semester_and_course(text: str) -> Tuple[Optional[str], Optional[str]]:
    sem = None
    course = None
    sem_match = SEMESTER_PATTERN.search(text)
    if sem_match:
        sem = sem_match.group(1).upper()
    course_match = COURSE_PATTERN.search(text)
    if course_match:
        course = course_match.group(1).upper()
    return sem, course

class CalendarExtractor:
    def __init__(self, default_year: int = 2026):
        self.default_year = default_year

    def extract_dates_from_text(
        self,
        text: str,
        doc_name: str = "",
        page: int = 1,
        chunk_id: str = "",
        intent: Optional[str] = None,
        effective_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Extracts calendar dates and ranges from text snippet.
        Returns candidate events conforming to feature specification.
        """
        if not text or not text.strip():
            return []

        # Determine fallback year
        fallback_year = self.default_year
        if effective_date:
            try:
                fallback_year = int(effective_date[:4])
            except Exception:
                pass

        normalized_text = _normalize_digits(text)
        sentences = [s.strip() for s in re.split(r'[.\n\r]+', normalized_text) if s.strip()]

        candidates = []
        seen_keys = set()

        for sent in sentences:
            if _is_relative_expression(sent):
                continue

            sem, course = _extract_semester_and_course(normalized_text)
            category = classify_event_category(normalized_text, intent=intent)
            matched_spans = []

            # Check Range Pattern Numeric: DD/MM/YYYY to DD/MM/YYYY
            for m in RANGE_PATTERN_NUMERIC.finditer(sent):
                d1, m1, y1, d2, m2, y2 = m.groups()
                matched_spans.append(m.span())
                try:
                    start_date = f"{int(y1):04d}-{int(m1):02d}-{int(d1):02d}"
                    end_date = f"{int(y2):04d}-{int(m2):02d}-{int(d2):02d}"
                    key = (start_date, end_date, category)
                    if key not in seen_keys:
                        seen_keys.add(key)
                        titles = generate_event_titles(category, intent, sem, course)
                        candidates.append({
                            "title": titles["en"],
                            "titles": titles,
                            "category": category,
                            "start": start_date,
                            "end": end_date,
                            "all_day": True,
                            "snippet": sent,
                            "doc_name": doc_name,
                            "page": page,
                            "chunk_id": chunk_id,
                            "confidence": 0.95,
                            "needs_review": False,
                            "semester": sem,
                            "course": course
                        })
                except Exception as e:
                    logger.debug(f"Numeric range parse error: {e}")

            # Check Range Pattern 1: e.g. "10 to 20 Dec 2026"
            for m in RANGE_PATTERN_1.finditer(sent):
                d1_str, d2_str, month_str, year_str = m.groups()
                matched_spans.append(m.span())
                m_num = _parse_month(month_str)
                if m_num:
                    needs_review = year_str is None
                    year_val = int(year_str) if year_str else fallback_year
                    try:
                        start_date = f"{year_val:04d}-{m_num:02d}-{int(d1_str):02d}"
                        end_date = f"{year_val:04d}-{m_num:02d}-{int(d2_str):02d}"
                        key = (start_date, end_date, category)
                        if key not in seen_keys:
                            seen_keys.add(key)
                            titles = generate_event_titles(category, intent, sem, course)
                            candidates.append({
                                "title": titles["en"],
                                "titles": titles,
                                "category": category,
                                "start": start_date,
                                "end": end_date,
                                "all_day": True,
                                "snippet": sent,
                                "doc_name": doc_name,
                                "page": page,
                                "chunk_id": chunk_id,
                                "confidence": 0.90 if not needs_review else 0.75,
                                "needs_review": needs_review,
                                "semester": sem,
                                "course": course
                            })
                    except Exception as e:
                        logger.debug(f"Range 1 parse error: {e}")

            # Check Range Pattern 2: e.g. "10 Dec to 20 Dec 2026"
            for m in RANGE_PATTERN_2.finditer(sent):
                d1_str, m1_str, y1_str, d2_str, m2_str, y2_str = m.groups()
                matched_spans.append(m.span())
                m1_num = _parse_month(m1_str)
                m2_num = _parse_month(m2_str)
                if m1_num and m2_num:
                    needs_review = (y1_str is None and y2_str is None)
                    year_val1 = int(y1_str) if y1_str else (int(y2_str) if y2_str else fallback_year)
                    year_val2 = int(y2_str) if y2_str else year_val1
                    try:
                        start_date = f"{year_val1:04d}-{m1_num:02d}-{int(d1_str):02d}"
                        end_date = f"{year_val2:04d}-{m2_num:02d}-{int(d2_str):02d}"
                        key = (start_date, end_date, category)
                        if key not in seen_keys:
                            seen_keys.add(key)
                            titles = generate_event_titles(category, intent, sem, course)
                            candidates.append({
                                "title": titles["en"],
                                "titles": titles,
                                "category": category,
                                "start": start_date,
                                "end": end_date,
                                "all_day": True,
                                "snippet": sent,
                                "doc_name": doc_name,
                                "page": page,
                                "chunk_id": chunk_id,
                                "confidence": 0.92 if not needs_review else 0.78,
                                "needs_review": needs_review,
                                "semester": sem,
                                "course": course
                            })
                    except Exception as e:
                        logger.debug(f"Range 2 parse error: {e}")

            def _overlaps_range(span):
                for r_start, r_end in matched_spans:
                    if not (span[1] <= r_start or span[0] >= r_end):
                        return True
                return False

            # Single Date: Numeric DMY (25/11/2026, 25-11-2026)
            for m in NUMERIC_DATE_DMY.finditer(sent):
                if _overlaps_range(m.span()):
                    continue
                d_str, m_str, y_str = m.groups()
                try:
                    d_int, m_int, y_int = int(d_str), int(m_str), int(y_str)
                    if 1 <= d_int <= 31 and 1 <= m_int <= 12 and 2000 <= y_int <= 2099:
                        dt_iso = f"{y_int:04d}-{m_int:02d}-{d_int:02d}"
                        key = (dt_iso, dt_iso, category)
                        if key not in seen_keys:
                            seen_keys.add(key)
                            titles = generate_event_titles(category, intent, sem, course)
                            candidates.append({
                                "title": titles["en"],
                                "titles": titles,
                                "category": category,
                                "start": dt_iso,
                                "end": dt_iso,
                                "all_day": True,
                                "snippet": sent,
                                "doc_name": doc_name,
                                "page": page,
                                "chunk_id": chunk_id,
                                "confidence": 0.95,
                                "needs_review": False,
                                "semester": sem,
                                "course": course
                            })
                except Exception:
                    pass

            # Single Date: Text Month DMY ("25th November 2026", "25 Nov")
            for m in TEXT_DATE_DMY.finditer(sent):
                if _overlaps_range(m.span()):
                    continue
                d_str, month_str, year_str = m.groups()
                m_num = _parse_month(month_str)
                if m_num:
                    needs_review = year_str is None
                    year_val = int(year_str) if year_str else fallback_year
                    try:
                        d_int = int(d_str)
                        if 1 <= d_int <= 31:
                            dt_iso = f"{year_val:04d}-{m_num:02d}-{d_int:02d}"
                            key = (dt_iso, dt_iso, category)
                            if key not in seen_keys:
                                seen_keys.add(key)
                                titles = generate_event_titles(category, intent, sem, course)
                                candidates.append({
                                    "title": titles["en"],
                                    "titles": titles,
                                    "category": category,
                                    "start": dt_iso,
                                    "end": dt_iso,
                                    "all_day": True,
                                    "snippet": sent,
                                    "doc_name": doc_name,
                                    "page": page,
                                    "chunk_id": chunk_id,
                                    "confidence": 0.92 if not needs_review else 0.70,
                                    "needs_review": needs_review,
                                    "semester": sem,
                                    "course": course
                                })
                    except Exception:
                        pass

            # Single Date: Text Month MDY ("November 25, 2026")
            for m in TEXT_DATE_MDY.finditer(sent):
                if _overlaps_range(m.span()):
                    continue
                month_str, d_str, year_str = m.groups()
                m_num = _parse_month(month_str)
                if m_num:
                    needs_review = year_str is None
                    year_val = int(year_str) if year_str else fallback_year
                    try:
                        d_int = int(d_str)
                        if 1 <= d_int <= 31:
                            dt_iso = f"{year_val:04d}-{m_num:02d}-{d_int:02d}"
                            key = (dt_iso, dt_iso, category)
                            if key not in seen_keys:
                                seen_keys.add(key)
                                titles = generate_event_titles(category, intent, sem, course)
                                candidates.append({
                                    "title": titles["en"],
                                    "titles": titles,
                                    "category": category,
                                    "start": dt_iso,
                                    "end": dt_iso,
                                    "all_day": True,
                                    "snippet": sent,
                                    "doc_name": doc_name,
                                    "page": page,
                                    "chunk_id": chunk_id,
                                    "confidence": 0.92 if not needs_review else 0.70,
                                    "needs_review": needs_review,
                                    "semester": sem,
                                    "course": course
                                })
                    except Exception:
                        pass

        return candidates

calendar_extractor = CalendarExtractor()
