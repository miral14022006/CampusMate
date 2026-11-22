import re
import json
import logging
from pathlib import Path
from functools import lru_cache
from typing import Dict, Any, Tuple

logger = logging.getLogger("nlp_service.transliteration")

try:
    from ai4bharat.transliteration import XlitEngine
    INDIC_XLIT_AVAILABLE = True
except Exception:
    INDIC_XLIT_AVAILABLE = False

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
LEXICONS_DIR = DATA_DIR / "lexicons"

INDIC_TO_ENGLISH_MAP = {
    # Gujarati
    "હોસ્ટેલ": "hostel accommodation room residence",
    "હોસ્ટેલની": "hostel accommodation fee",
    "મેસ": "mess food dining",
    "મેસની": "mess food dining",
    "પરીક્ષા": "exam examination",
    "પરીક્ષાની": "exam examination",
    "પરીક્ષાનું": "exam timetable schedule",
    "તારીખ": "date schedule",
    "તારીખો": "dates schedule",
    "સમયપત્રક": "timetable schedule datesheet",
    "સમય": "timing time",
    "ભરવાની": "registration form deadline submission last date",
    "ભરવા": "submit apply registration",
    "છેલ્લી": "last final deadline",
    "છેલ્લા": "last final",
    "અંતિમ": "last final deadline",
    "રજા": "holiday vacation",
    "રજાઓ": "holidays vacation",
    "ફી": "fee fees tuition payment",
    "પરિણામ": "result grade marksheet",
    "છાત્રાલય": "hostel accommodation",
    # Additional college timetable vocabulary
    "ટાઈમટેબલ": "exam timetable schedule datesheet",
    "ટાઇમટેબલ": "exam timetable schedule datesheet",
    "ટાઈમ ટેબલ": "exam timetable schedule datesheet",
    "વિષયો": "subject subjects courses",
    "વિષય": "subject course",
    "બધા": "all complete",
    "માહિતી": "information details",
    "આપો": "give show provide",
    "વિગતો": "details information",
    "विषय": "subject course",
    "सभी": "all every complete",
    "जानकारी": "information details",
    "बताइए": "tell give show provide",
    "दीजिए": "give provide show",
    "સેમ": "semester",
    "કમ્પ્યુટર": "computer",
    "એન્જિનિયરિંગ": "engineering",
    "સાયન્સ": "science",
    "computer engineering": "computer engineering",
    "computer science": "computer science",
    "cse": "cse computer",
    "sem 7": "semester 7 sem 7 semester vii",
    "sem7": "semester 7 sem 7 semester vii",
    "time table": "timetable schedule",
    "aapo": "give show",
    "badha": "all complete",
    "badhi": "all complete",
    "mate": "for",
    "nu": "of",
    "na": "of",
    "ni": "of",
    "પ્રવેશ": "admission enrollment",
    # Campus Festivals & Events (Gujarati)
    "રંગતાલ": "rangtaal navratri celebration",
    "ટેસેરેક્ટ": "tesseract science technical fest",
    "ફ્લેર": "flare social cultural fest",
    "એનર્જી કપ": "energy cup sports fest",
    # Hindi
    "होस्टल": "hostel accommodation room residence fee",
    "हॉस्टल": "hostel accommodation room residence fee",
    "मेस": "mess food dining",
    "फीस": "fee fees charges payment amount",
    "परीक्षा": "exam examination",
    "तारीख": "date schedule",
    "समय सारिणी": "timetable schedule datesheet",
    "भरने": "registration form deadline submission last date",
    "अंतिम": "last final deadline",
    "आखिरी": "last final deadline",
    "छुट्टी": "holiday vacation",
    "शुल्क": "fee tuition payment",
    "परिणाम": "result grade marksheet",
    "छात्रावास": "hostel accommodation",
    # Campus Festivals & Events (Hindi)
    "रंगताल": "rangtaal navratri celebration",
    "टेसेरैक्ट": "tesseract science technical fest",
    "फ्लेयर": "flare social cultural fest",
    "एनर्जी कप": "energy cup sports fest",
    # Romanized Gujlish
    "hostel": "hostel accommodation fee",
    "bharvani": "registration form deadline submission last date",
    "chelli": "last final deadline",
    "samaypatrak": "timetable schedule",
    "chhutti": "holiday vacation",
    "pariksha": "exam examination",
    # Romanized Hinglish
    "bharne": "registration form deadline submission last date",
    "aakhri": "last final deadline",
    "antim": "last final deadline",
    "chutti": "holiday vacation"
}

class TransliterationEngine:
    def __init__(self):
        self.hi_rules = self._load_json(LEXICONS_DIR / "translit_rules_hi.json")
        self.gu_rules = self._load_json(LEXICONS_DIR / "translit_rules_gu.json")
        self.english_vocab = self._load_vocab(LEXICONS_DIR / "english_college_vocab.txt")
        self.xlit_engine = None
        self._init_indic_xlit()

    def _load_json(self, path: Path) -> Dict[str, Any]:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading {path}: {e}")
        return {"words": {}, "consonants": {}, "vowels": {}}

    def _load_vocab(self, path: Path) -> set:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return {line.strip().lower() for line in f if line.strip()}
            except Exception as e:
                logger.error(f"Error loading {path}: {e}")
        return set()

    def _init_indic_xlit(self):
        if INDIC_XLIT_AVAILABLE:
            try:
                self.xlit_engine = XlitEngine(["hi", "gu"], beam_width=4, rescore=True)
                logger.info("AI4Bharat IndicXlit engine initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not load IndicXlit engine: {e}. Using rule & lexicon fallback.")
                self.xlit_engine = None
        else:
            self.xlit_engine = None

    def is_english_token(self, token: str) -> bool:
        clean = token.lower().strip()
        if not clean or clean.isdigit():
            return True
        if clean in self.english_vocab:
            return True
        if clean.endswith("ing") or clean.endswith("ed") or clean.endswith("tion") or clean.endswith("able"):
            return True
        return False

    @lru_cache(maxsize=10000)
    def transliterate_token(self, token: str, lang: str) -> str:
        clean_token = token.lower().strip()
        if not clean_token:
            return token

        if self.is_english_token(clean_token):
            return token

        rules = self.hi_rules if lang in ["hi", "hi-Latn"] else self.gu_rules
        words_dict = rules.get("words", {})

        if clean_token in words_dict:
            return words_dict[clean_token]

        if self.xlit_engine:
            try:
                target_lang = "hi" if lang in ["hi", "hi-Latn"] else "gu"
                res = self.xlit_engine.translit_word(clean_token, lang_code=target_lang)
                if res and isinstance(res, list) and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        consonants = rules.get("consonants", {})
        vowels = rules.get("vowels", {})

        chars = []
        i = 0
        n = len(clean_token)

        while i < n:
            if i + 3 <= n and clean_token[i:i+3] in consonants:
                chars.append(consonants[clean_token[i:i+3]])
                i += 3
            elif i + 2 <= n and clean_token[i:i+2] in consonants:
                chars.append(consonants[clean_token[i:i+2]])
                i += 2
            elif i + 2 <= n and clean_token[i:i+2] in vowels:
                chars.append(vowels[clean_token[i:i+2]])
                i += 2
            elif clean_token[i] in consonants:
                chars.append(consonants[clean_token[i]])
                i += 1
            elif clean_token[i] in vowels:
                chars.append(vowels[clean_token[i]])
                i += 1
            else:
                chars.append(clean_token[i])
                i += 1

        return "".join(chars) if chars else token

    def transliterate_text(self, text: str, lang: str) -> Tuple[str, str]:
        if not text or lang not in ["hi-Latn", "gu-Latn", "hi", "gu"]:
            return text, text

        tokens = text.split()
        transliterated_tokens = []

        for token in tokens:
            match = re.match(r'^(\W*)(.*?)(\W*)$', token)
            if match:
                prefix, core, suffix = match.groups()
                if core:
                    t_core = self.transliterate_token(core, lang)
                    transliterated_tokens.append(f"{prefix}{t_core}{suffix}")
                else:
                    transliterated_tokens.append(token)
            else:
                transliterated_tokens.append(self.transliterate_token(token, lang))

        transliterated = " ".join(transliterated_tokens)
        dual_form = f"{text} {transliterated}".strip()
        return transliterated, dual_form

    def expand_with_english_concepts(self, text: str) -> str:
        text_lower = text.lower()
        english_additions = []
        for term, expansion in INDIC_TO_ENGLISH_MAP.items():
            if term in text_lower:
                english_additions.append(expansion)
        if english_additions:
            unique_additions = " ".join(dict.fromkeys(" ".join(english_additions).split()))
            return f"{text} {unique_additions}".strip()
        return text

transliteration_engine = TransliterationEngine()
