import re
import json
from typing import List, Dict, Any
from app.config import PATTERNS_DIR

# Try spacy import; if unavailable or missing model, fallback smoothly to pattern matcher
try:
    import spacy
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False

class EntityExtractor:
    def __init__(self):
        self.nlp = None
        self.patterns = self._load_patterns()
        self._init_spacy_or_regex()

    def _load_patterns(self) -> List[Dict[str, str]]:
        patterns = []
        for file in PATTERNS_DIR.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        patterns.extend(data)
            except Exception:
                pass
        return patterns

    def _init_spacy_or_regex(self):
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.blank("en")
                ruler = self.nlp.add_pipe("entity_ruler")
                ruler.add_patterns(self.patterns)
            except Exception:
                self.nlp = None
        else:
            self.nlp = None

    def extract_regex_entities(self, text: str) -> List[Dict[str, Any]]:
        entities = []

        # 1. SEMESTER regex: 'sem 5', '5th sem', 'semester 3', 'પાંચમું સેમેસ્ટર', '5th semester', 'पांचवा सेमेस्टर'
        sem_patterns = [
            r'(?:sem(?:ester)?|સેમેસ્ટર|सेमेस्टर)\s*[-:]?\s*([1-8])\b',
            r'\b([1-8])(?:st|nd|rd|th)?\s*(?:sem(?:ester)?|સેમેસ્ટર|सेमेस्टर)\b',
            r'\b(?:पांचवा|तीसरा|चौथा|पहला|दूसरा)\s*सेमेस्टर\b',
            r'\b(?:પાંચમું|ત્રીજું|ચોથું|પહેલું|બીજું)\s*સેમેસ્ટર\b'
        ]
        for pat in sem_patterns:
            for match in re.finditer(pat, text, re.IGNORECASE):
                entities.append({
                    "label": "SEMESTER",
                    "text": match.group(0),
                    "start": match.start(),
                    "end": match.end()
                })

        # 2. DATE regex: '15th March', '15-03-2024', '15/03/2024', '30th April'
        date_pattern = r'\b(?:\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
        for match in re.finditer(date_pattern, text, re.IGNORECASE):
            entities.append({
                "label": "DATE",
                "text": match.group(0),
                "start": match.start(),
                "end": match.end()
            })

        # 3. Direct pattern list matches
        for p in self.patterns:
            pat_text = p.get("pattern", "")
            if not pat_text:
                continue
            # Case insensitive match
            for m in re.finditer(re.escape(pat_text), text, re.IGNORECASE):
                entities.append({
                    "label": p.get("label", "ENTITY"),
                    "text": m.group(0),
                    "start": m.start(),
                    "end": m.end()
                })

        # Deduplicate overlapping entities
        unique = []
        seen = set()
        for e in sorted(entities, key=lambda x: (x["start"], -(x["end"] - x["start"]))):
            span = (e["start"], e["end"], e["label"])
            if span not in seen:
                seen.add(span)
                unique.append(e)

        return unique

    def extract(self, text: str) -> List[Dict[str, Any]]:
        """Extracts COURSE, SEMESTER, BRANCH, EXAM_TYPE, and DATE entities."""
        if not text:
            return []

        # If spacy blank pipeline with entity ruler is initialized
        results = []
        if self.nlp:
            try:
                doc = self.nlp(text)
                for ent in doc.ents:
                    results.append({
                        "label": ent.label_,
                        "text": ent.text,
                        "start": ent.start_char,
                        "end": ent.end_char
                    })
            except Exception:
                pass

        # Supplement with Regex (Semester, Date, Indic)
        regex_matches = self.extract_regex_entities(text)
        for r in regex_matches:
            if not any(res["start"] == r["start"] and res["end"] == r["end"] for res in results):
                results.append(r)

        return sorted(results, key=lambda x: x["start"])

entity_extractor = EntityExtractor()

