import re
from typing import Dict, Any, List, Optional

# Institution specific entities and dictionaries
BRANCH_MAP = {
    "cse": "Computer Science and Engineering",
    "cs": "Computer Science and Engineering",
    "ce": "Computer Engineering",
    "it": "Information Technology",
    "ict": "Information and Communication Technology",
    "information and communication technology": "Information and Communication Technology",
    "mechanical": "Mechanical Engineering",
    "me": "Mechanical Engineering",
    "robotics": "Robotics and Automation",
    "chemical": "Chemical Engineering",
    "che": "Chemical Engineering",
    "civil": "Civil Engineering",
    "electrical": "Electrical Engineering",
    "ee": "Electrical Engineering",
    "petroleum": "Petroleum Engineering",
    "pe": "Petroleum Engineering",
    "vlsi": "VLSI Design",
    "cyber security": "Cyber Security"
}

COURSE_CODES = [
    "24HS501T", "21MSP505T", "24VLSI501T", "21MT501T", "20CP501T"
]

EXAM_TYPES = [
    "end semester", "mid semester", "regular", "remedial", "supplementary", "winter", "summer"
]

def extract_entities(text: str) -> Dict[str, Any]:
    """
    Extract course, branch, semester, exam_type, academic_year, dates.
    """
    text_lower = text.lower()
    res: Dict[str, Any] = {
        "course": None,
        "branch": None,
        "department": None,
        "semester": None,
        "exam_type": None,
        "academic_year": None,
        "dates": [],
        "entities": {}
    }

    # 1. Branch Extraction
    for b_key, b_val in BRANCH_MAP.items():
        pattern = r'\b' + re.escape(b_key) + r'\b'
        if re.search(pattern, text_lower):
            res["branch"] = b_val
            res["entities"]["branch"] = b_val
            break

    # 2. Semester Extraction (e.g. "5th sem", "semester 5", "sem 1", "M.Tech - I")
    sem_match = re.search(r'\b(?:sem|semester)\s*([1-8ivx]+)\b|\b([1-8])(?:st|nd|rd|th)?\s*(?:sem|semester)\b', text_lower)
    if sem_match:
        val = sem_match.group(1) or sem_match.group(2)
        # Roman numeral mapping
        roman_map = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8}
        if val.lower() in roman_map:
            res["semester"] = roman_map[val.lower()]
        elif val.isdigit():
            res["semester"] = int(val)
        res["entities"]["semester"] = res["semester"]

    # 3. Course Code Extraction
    for code in COURSE_CODES:
        if re.search(r'\b' + re.escape(code.lower()) + r'\b', text_lower):
            res["course"] = code
            res["entities"]["course_code"] = code
            break

    # 4. Exam Type
    for et in EXAM_TYPES:
        if et in text_lower:
            res["exam_type"] = et
            res["entities"]["exam_type"] = et
            break

    # 5. Academic Year (e.g. 2024, 2026, 2026-27)
    year_match = re.search(r'\b(20[2-3][0-9])(?:-(?:20)?[2-3][0-9])?\b', text)
    if year_match:
        res["academic_year"] = int(year_match.group(1))
        res["entities"]["academic_year"] = res["academic_year"]

    # 6. Dates extraction (e.g. "26.11.2026", "15-08-2024", "12th May 2027")
    date_patterns = [
        r'\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b',
        r'\b\d{1,2}(?:st|nd|rd|th)?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{2,4}\b'
    ]
    for dp in date_patterns:
        matches = re.findall(dp, text, flags=re.IGNORECASE)
        for m in matches:
            if m not in res["dates"]:
                res["dates"].append(m)

    return res
