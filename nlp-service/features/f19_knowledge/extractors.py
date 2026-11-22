import os
import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
import requests

logger = logging.getLogger("nlp_service.f19_knowledge.extractors")

MONTH_NAMES = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12,
    # Gujarati transliterated / scripts
    "janvari": 1, "februari": 2, "march": 3, "epril": 4, "me": 5, "jun": 6,
    # Hindi / Indic
    "janavari": 1, "farvari": 2, "maarch": 3, "aprail": 4, "mai": 5,
    "joon": 6, "julaee": 6, "agast": 8, "sitambar": 9, "aktoobar": 10,
    "navambar": 11, "disambar": 12
}

BRANCH_PATTERNS = [
    r'\b(?:CSE|ICT|Mechanical|Civil|Chemical|Petroleum|Robotics|Automobile|Electrical)\b',
    r'\b(?:M\.Tech|B\.Tech|M\.Sc|B\.Sc|Ph\.D)\b'
]

COURSE_CODE_PATTERN = r'\b(?:2[0-9][A-Z]{2}[0-9]{3}[A-Z0-9]?|[A-Z]{2,4}[0-9]{3,4}[A-Z]?)\b'

SEMESTER_PATTERN = r'\b(?:Sem(?:ester)?\.?\s*([0-9]|I{1,3}|IV|V|VI|VII|VIII))\b'

def normalize_text_spacing(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()

def extract_dates(text: str) -> List[str]:
    dates = []
    # e.g. 26.11.2026, 26/11/2026, 26-11-2026
    num_matches = re.findall(r'\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b', text)
    for m in num_matches:
        if m not in dates:
            dates.append(m)
    # e.g. 26th November 2026, 26 November, 2026, 26" January,2024 (from OCR)
    word_matches = re.findall(r'\b\d{1,2}(?:st|nd|rd|th|["\']*)?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]*\d{2,4}\b', text, flags=re.IGNORECASE)
    for m in word_matches:
        if m not in dates:
            dates.append(m)
    return dates

def extract_times(text: str) -> List[str]:
    times = []
    matches = re.findall(r'\b\d{1,2}[:.]\d{2}\s*(?:am|pm|hrs)?(?:\s*(?:to|-)\s*\d{1,2}[:.]\d{2}\s*(?:am|pm|hrs)?)?\b', text, flags=re.IGNORECASE)
    for m in matches:
        if m not in times:
            times.append(m)
    return times

def extract_amounts(text: str) -> List[str]:
    amounts = []
    matches = re.findall(r'(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?', text, flags=re.IGNORECASE)
    for m in matches:
        if m not in amounts:
            amounts.append(m)
    return amounts

def extract_tags(text: str) -> Dict[str, Any]:
    tags = {
        "branch": None,
        "course": None,
        "semester": None
    }
    course_match = re.search(COURSE_CODE_PATTERN, text)
    if course_match:
        tags["course"] = course_match.group(0)
    
    branch_match = re.search(r'\b(CSE|ICT|Mechanical|Civil|Chemical|Petroleum|Robotics)\b', text, flags=re.IGNORECASE)
    if branch_match:
        tags["branch"] = branch_match.group(0).upper()
        
    sem_match = re.search(SEMESTER_PATTERN, text, flags=re.IGNORECASE)
    if sem_match:
        tags["semester"] = sem_match.group(0)
        
    return tags

def verify_grounding(chunk_text: str, source_quote: str, answer: str) -> Tuple[bool, str]:
    """
    source_quote must be an exact substring of the chunk text (after whitespace normalization)
    and every date, amount, and number in the answer must appear in that quote.
    """
    if not source_quote or not chunk_text:
        return False, "Empty source quote or chunk text"
    
    norm_chunk = normalize_text_spacing(chunk_text)
    norm_quote = normalize_text_spacing(source_quote)
    
    if norm_quote not in norm_chunk:
        return False, f"source_quote is not an exact substring of chunk_text"
    
    # Check all numbers in answer exist in quote
    # extract numbers (>0 chars, ignoring punctuation)
    ans_nums = re.findall(r'\b\d+\b', answer)
    for num in ans_nums:
        if num not in norm_quote:
            return False, f"Number '{num}' in answer not present in source_quote"
            
    # Check dates and amounts
    ans_dates = extract_dates(answer)
    for d in ans_dates:
        # Check either exact date or year/day parts
        clean_d = re.sub(r'["\']', '', d)
        if clean_d not in norm_quote and not any(part in norm_quote for part in re.split(r'[./\s,-]+', clean_d) if len(part) >= 3):
            return False, f"Date '{d}' in answer not found in source_quote"
            
    ans_amounts = extract_amounts(answer)
    for amt in ans_amounts:
        if amt not in norm_quote:
            return False, f"Amount '{amt}' in answer not found in source_quote"
            
    return True, "OK"

class KnowledgeExtractor:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        self.auto_approve = os.getenv("AUTO_APPROVE_VERIFIED", "true").lower() == "true"

    def extract_from_table_rows(
        self,
        tables: List[List[List[str]]],
        doc_id: str,
        doc_name: str,
        page: int,
        chunk_text: str
    ) -> List[Dict[str, Any]]:
        """Turn structured table rows into validated facts."""
        facts = []
        for table in tables:
            if not table or len(table) < 2:
                continue
            headers = [normalize_text_spacing(str(c or "")) for c in table[0]]
            for row in table[1:]:
                row_cells = [normalize_text_spacing(str(c or "")) for c in row]
                row_str = " | ".join([c for c in row_cells if c])
                if not row_str or len(row_str) < 10:
                    continue
                
                # Formulate structured fact
                dates = extract_dates(row_str)
                times = extract_times(row_str)
                amounts = extract_amounts(row_str)
                tags = extract_tags(row_str)
                
                title = f"{doc_name} (Page {page}): " + (tags.get("course") or row_cells[0] or "Entry")
                answer = row_str
                
                # Check quote against chunk_text; if row not in chunk_text, check if cells appear
                source_quote = row_str
                is_valid, reason = verify_grounding(chunk_text, source_quote, answer)
                if not is_valid:
                    # Try finding the first matching substantial cell in chunk_text
                    for c in row_cells:
                        if len(c) > 15 and c in chunk_text:
                            source_quote = c
                            is_valid, reason = verify_grounding(chunk_text, source_quote, answer)
                            if is_valid:
                                break
                                
                status = "approved" if (is_valid and self.auto_approve) else ("needs_review" if not is_valid else "approved")
                
                fact = {
                    "doc_id": doc_id,
                    "doc_name": doc_name,
                    "page": page,
                    "type": "schedule_row" if times or "exam" in row_str.lower() else "general",
                    "topic_key": tags.get("course") or tags.get("branch") or doc_name,
                    "title": title[:100],
                    "answer": answer,
                    "question_variants": [
                        f"When is {tags.get('course') or 'the exam'} scheduled?",
                        f"What is the schedule for {row_cells[0] if row_cells else 'this event'}?",
                        f"{row_str[:50]} details"
                    ],
                    "values": {
                        "dates": dates,
                        "amounts": amounts,
                        "times": times
                    },
                    "tags": tags,
                    "source_quote": source_quote,
                    "confidence": 0.95 if is_valid else 0.50,
                    "extracted_by": "rule",
                    "status": status,
                    "rejection_reason": None if is_valid else reason
                }
                facts.append(fact)
        return facts

    def extract_from_rules(
        self,
        chunk_text: str,
        doc_id: str,
        doc_name: str,
        page: int
    ) -> List[Dict[str, Any]]:
        """Extract facts using pure deterministic regex & pattern matching (always on)."""
        facts = []
        lines = chunk_text.split('\n')
        
        for line in lines:
            line_str = normalize_text_spacing(line)
            if len(line_str) < 15:
                continue
                
            dates = extract_dates(line_str)
            amounts = extract_amounts(line_str)
            times = extract_times(line_str)
            tags = extract_tags(line_str)
            
            fact_type = None
            if amounts:
                fact_type = "fee"
            elif dates and ("holiday" in line_str.lower() or "exam" in line_str.lower() or "date" in line_str.lower() or "commence" in line_str.lower()):
                fact_type = "date_event"
            elif "rule" in line_str.lower() or "eligible" in line_str.lower():
                fact_type = "eligibility" if "eligible" in line_str.lower() else "rule"
            elif times:
                fact_type = "schedule_row"
            elif dates:
                fact_type = "date_event"
                
            if not fact_type:
                continue
                
            source_quote = line_str
            is_valid, reason = verify_grounding(chunk_text, source_quote, line_str)
            status = "approved" if (is_valid and self.auto_approve) else "needs_review"
            
            topic = tags.get("course") or tags.get("branch") or (dates[0] if dates else doc_name)
            
            facts.append({
                "doc_id": doc_id,
                "doc_name": doc_name,
                "page": page,
                "type": fact_type,
                "topic_key": str(topic)[:50],
                "title": line_str[:80],
                "answer": line_str,
                "question_variants": [
                    f"What is the date for {line_str[:40]}?",
                    f"Tell me about {topic}",
                    f"When is {line_str[:30]}?"
                ],
                "values": {
                    "dates": dates,
                    "amounts": amounts,
                    "times": times
                },
                "tags": tags,
                "source_quote": source_quote,
                "confidence": 0.90 if is_valid else 0.40,
                "extracted_by": "rule",
                "status": status,
                "rejection_reason": None if is_valid else reason
            })
            
        return facts

    def extract_from_llm(
        self,
        chunk_text: str,
        doc_id: str,
        doc_name: str,
        page: int
    ) -> List[Dict[str, Any]]:
        """LLM-assisted fact extraction when GEMINI_KEY is operational."""
        if not self.gemini_key:
            return []
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
        prompt = f"""You are a precise institutional knowledge extractor.
Extract factual statements explicitly stated in the chunk below.
RULES:
1. ONLY facts explicitly stated. Absolutely no inference or guessing.
2. Answer in the document's language and keep it short.
3. source_quote MUST be an EXACT character substring copied from the chunk text.
4. Return ONLY a valid JSON array of objects with keys:
   [
     {{
       "type": "date_event"|"fee"|"rule"|"procedure"|"contact"|"eligibility"|"schedule_row"|"general",
       "topic_key": "string",
       "title": "string",
       "answer": "string",
       "question_variants": ["variant1", "variant2"],
       "values": {{"dates": [], "amounts": [], "times": []}},
       "tags": {{"semester": null, "course": null, "branch": null}},
       "source_quote": "exact substring from chunk"
     }}
   ]

DOCUMENT: {doc_name} (Page {page})
CHUNK:
{chunk_text}
"""
        try:
            resp = requests.post(
                url,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.0, "maxOutputTokens": 2048}
                },
                timeout=15
            )
            if resp.status_code != 200:
                logger.warning(f"LLM extraction call returned HTTP {resp.status_code}")
                return []
                
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return []
                
            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            # Clean markdown codeblocks
            clean_json = re.sub(r'^```json\s*', '', raw_text.strip(), flags=re.MULTILINE)
            clean_json = re.sub(r'```$', '', clean_json.strip(), flags=re.MULTILINE)
            
            parsed = json.loads(clean_json)
            facts = []
            for item in parsed:
                src_quote = item.get("source_quote", "")
                ans = item.get("answer", "")
                is_valid, reason = verify_grounding(chunk_text, src_quote, ans)
                
                status = "approved" if (is_valid and self.auto_approve) else "needs_review"
                facts.append({
                    "doc_id": doc_id,
                    "doc_name": doc_name,
                    "page": page,
                    "type": item.get("type", "general"),
                    "topic_key": item.get("topic_key", doc_name),
                    "title": item.get("title", ans[:60]),
                    "answer": ans,
                    "question_variants": item.get("question_variants", []),
                    "values": item.get("values", {"dates": [], "amounts": [], "times": []}),
                    "tags": item.get("tags", {"semester": None, "course": None, "branch": None}),
                    "source_quote": src_quote,
                    "confidence": 0.95 if is_valid else 0.40,
                    "extracted_by": "llm",
                    "status": status,
                    "rejection_reason": None if is_valid else reason
                })
            return facts
        except Exception as e:
            logger.warning(f"Error in LLM fact extraction: {e}")
            return []

    def extract_document_facts(
        self,
        doc_id: str,
        doc_name: str,
        chunks: List[Dict[str, Any]],
        tables_per_page: Optional[Dict[int, List[List[List[str]]]]] = None
    ) -> List[Dict[str, Any]]:
        """Extract and de-duplicate facts from rules and LLM."""
        all_facts = []
        seen_keys = set()
        
        for chunk in chunks:
            page = chunk.get("page_number", 1)
            text = chunk.get("content", "")
            
            # 1. Rule-based extraction
            rule_facts = self.extract_from_rules(text, doc_id, doc_name, page)
            for f in rule_facts:
                key = (f["doc_name"], f["page"], normalize_text_spacing(f["answer"]))
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_facts.append(f)
                    
            # 2. Table rows extraction if available
            if tables_per_page and page in tables_per_page:
                tbl_facts = self.extract_from_table_rows(tables_per_page[page], doc_id, doc_name, page, text)
                for f in tbl_facts:
                    key = (f["doc_name"], f["page"], normalize_text_spacing(f["answer"]))
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_facts.append(f)
                        
            # 3. LLM extraction if key configured
            llm_facts = self.extract_from_llm(text, doc_id, doc_name, page)
            for f in llm_facts:
                key = (f["doc_name"], f["page"], normalize_text_spacing(f["answer"]))
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_facts.append(f)
                    
        return all_facts
