import re
from pathlib import Path
from typing import Dict, Any, Set
from app.config import LEXICONS_DIR

# Embedded high-frequency Hinglish (Romanized Hindi) words
# Excludes ambiguous English stopwords like 'the', 'me', 'in', 'is', 'no', 'to'
DEFAULT_HINGLISH_WORDS = {
    # Question words
    "kya", "kyu", "kyun", "kab", "kaha", "kahan", "kaise", "kesa", "kese", "kaun",
    "kon", "kitna", "kitne", "kitni", "kiska", "kiski", "kisko",
    # Pronouns & nouns
    "aap", "apka", "apki", "hum", "hamara", "mera", "meri", "mere", "mujhe", "mujhko",
    "tum", "tumhara", "tumhe", "yeh", "ye", "woh", "wo", "unka", "inka", "bhai", "yaar",
    # Auxiliary verbs & verbs
    "hai", "hain", "hoon", "hun", "tha", "thi", "hoga", "hogi", "honge",
    "karo", "kare", "karna", "karein", "batao", "bataye", "bataiye", "bolo", "dekh",
    "dekho", "aayega", "aayegi", "mil", "milega", "milegi", "chahiye", "chahta", "sakta",
    "sakti", "sakte", "lagta", "lagti", "raha", "rahi", "rahe", "hota", "hoti", "hote",
    # Conjunctions, adverbs, prepositions
    "aur", "par", "lekin", "magar", "bhi", "sirf", "nahi", "nahin", "na",
    "mat", "pehle", "baad", "mein", "liye", "saath", "andar", "bahar", "bohot", "bahut", "thoda",
    # College common conversational words
    "chhutti", "chhuttiya", "pariksha", "padhai", "dakhila", "vidhyarthi"
}

# Embedded high-frequency Gujlish (Romanized Gujarati) words
# Excludes ambiguous English stopwords
DEFAULT_GUJLISH_WORDS = {
    # Question words
    "su", "shu", "kyare", "kyaare", "kem", "kemne", "ketla", "ketli", "ketlu",
    "kone", "konu", "koni", "kyaan", "kayo", "kai", "kayu",
    # Pronouns & nouns
    "mane", "maru", "mari", "mara", "tame", "tamne", "tamaru", "tamari", "tamara",
    "tene", "tenu", "teni", "tena", "aam", "tem", "pelo", "peli", "pelu",
    "mitra", "vidyarthi",
    # Auxiliary verbs & verbs
    "che", "chhe", "chho", "chhu", "hato", "hati", "hata", "hatu", "hase", "hovanu",
    "karvu", "karsho", "kare", "karyu", "aapse", "aavse", "aave", "aavyo",
    "joiye", "joie", "joyiye", "batavo", "janavo", "kaho", "levu", "malshe", "malse",
    "nathi", "thase", "thashe", "thay", "thayu",
    # Conjunctions, adverbs, prepositions
    "ane", "pan", "parantu", "fakt", "havve", "have",
    "pela", "pachi", "maan", "mate", "sathe", "ghana", "ghani", "thodu", "saru",
    # Common Gujlish phrases/tokens
    "bharvani", "karvani", "aavani", "laagi", "laage"
}

# English distinct vocabulary to avoid false positives on standard English queries
ENGLISH_DISTINCT_WORDS = {
    "when", "what", "where", "which", "who", "whom", "whose", "why", "how",
    "deadline", "registration", "examination", "timetable", "schedule", "syllabus",
    "department", "semester", "regulations", "university", "academic", "calendar",
    "the", "this", "that", "these", "those", "is", "are", "was", "were", "been",
    "will", "would", "shall", "should", "can", "could", "have", "has", "had",
    "for", "with", "from", "about", "into", "through", "during", "before", "after"
}


class LanguageDetector:
    def __init__(self):
        self.hinglish_words: Set[str] = set(DEFAULT_HINGLISH_WORDS)
        self.gujlish_words: Set[str] = set(DEFAULT_GUJLISH_WORDS)

        # Merge external wordlists if available
        ext_hinglish = self._load_wordlist(LEXICONS_DIR / "hinglish_words.txt")
        self.hinglish_words.update(ext_hinglish)

        ext_gujlish = self._load_wordlist(LEXICONS_DIR / "gujlish_words.txt")
        self.gujlish_words.update(ext_gujlish)

    def _load_wordlist(self, filepath: Path) -> Set[str]:
        if filepath.exists():
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    return {line.strip().lower() for line in f if line.strip()}
            except Exception:
                pass
        return set()

    def detect(self, text: str) -> Dict[str, Any]:
        """
        Detects script and language reliably for:
        - English ('en', Latin)
        - Hindi ('hi', Devanagari)
        - Gujarati ('gu', Gujarati script)
        - Hinglish ('hi-Latn', Latin script)
        - Gujlish ('gu-Latn', Latin script)
        """
        cleaned = text.strip()
        if not cleaned:
            return {"language": "en", "script": "Latin", "confidence": 1.0}

        devanagari_chars = re.findall(r'[\u0900-\u097F]', cleaned)
        gujarati_chars = re.findall(r'[\u0A80-\u0AFF]', cleaned)
        latin_chars = re.findall(r'[a-zA-Z]', cleaned)

        devanagari_count = len(devanagari_chars)
        gujarati_count = len(gujarati_chars)
        latin_count = len(latin_chars)
        total_letters = devanagari_count + gujarati_count + latin_count

        # 1. Native script detection (Devanagari vs Gujarati)
        if gujarati_count > 0 and gujarati_count >= devanagari_count:
            # If at least 2 Gujarati chars or >10% of total letters
            if gujarati_count >= 2 or (total_letters > 0 and (gujarati_count / total_letters) > 0.10):
                conf = min(0.99, round(0.70 + (gujarati_count / (total_letters or 1)) * 0.3, 2))
                return {"language": "gu", "script": "Gujarati", "confidence": conf}

        if devanagari_count > 0 and devanagari_count > gujarati_count:
            if devanagari_count >= 2 or (total_letters > 0 and (devanagari_count / total_letters) > 0.10):
                conf = min(0.99, round(0.70 + (devanagari_count / (total_letters or 1)) * 0.3, 2))
                return {"language": "hi", "script": "Devanagari", "confidence": conf}

        if total_letters == 0:
            return {"language": "en", "script": "Latin", "confidence": 0.5}

        # 2. Latin script classification (English vs Hinglish vs Gujlish)
        # Tokenize by words
        raw_tokens = re.findall(r'[a-zA-Z]+', cleaned.lower())
        if not raw_tokens:
            return {"language": "en", "script": "Latin", "confidence": 0.5}

        # Check explicit n-gram patterns for Gujlish and Hinglish
        q_lower = cleaned.lower()

        # Gujlish trigger phrases: e.g. "kyare che", "su che", "kem cho", "koni che", "form bharvani"
        gujlish_phrases = [
            r"\bkyare\s+(?:che|chhe)\b", r"\bsu\s+(?:che|chhe)\b", r"\bshu\s+(?:che|chhe)\b",
            r"\bkem\s+(?:cho|chho)\b", r"\bketli\s+(?:che|chhe|fii|fee)\b", r"\bketla\s+(?:che|chhe)\b",
            r"\bmate\s+(?:su|shu|che|chhe)\b", r"\bbharvani\s+(?:last\s+)?date\b", r"\baavse\b",
            r"\bjanavo\b", r"\bmahiti\s+aapo\b", r"\bkyare\b", r"\bche\b", r"\bchhe\b"
        ]
        has_gujlish_phrase = any(re.search(p, q_lower) for p in gujlish_phrases)

        # Hinglish trigger phrases: e.g. "kab hai", "kya hai", "kaise kare", "batao", "bataye"
        hinglish_phrases = [
            r"\bkab\s+(?:hai|hoga|hogi)\b", r"\bkya\s+(?:hai|hoga|hogi)\b", r"\bkaise\s+(?:kare|hoga)\b",
            r"\bkitni\s+(?:hai|fees?)\b", r"\bkitna\s+(?:hai)\b", r"\bbatao\b", r"\bbataiye\b",
            r"\bki\s+last\s+date\b", r"\bkab\s+se\b", r"\bhai\b", r"\bhain\b"
        ]
        has_hinglish_phrase = any(re.search(p, q_lower) for p in hinglish_phrases)

        english_hits = sum(1 for t in raw_tokens if t in ENGLISH_DISTINCT_WORDS)
        gujlish_hits = sum(1 for t in raw_tokens if t in self.gujlish_words)
        hinglish_hits = sum(1 for t in raw_tokens if t in self.hinglish_words)

        num_tokens = len(raw_tokens)
        g_ratio = gujlish_hits / num_tokens
        h_ratio = hinglish_hits / num_tokens
        e_ratio = english_hits / num_tokens

        # If clear English indicators and no Gujlish/Hinglish phrase, classify as English
        if english_hits >= 1 and not (has_gujlish_phrase or has_hinglish_phrase) and english_hits >= max(gujlish_hits, hinglish_hits):
            return {"language": "en", "script": "Latin", "confidence": min(0.99, round(0.70 + e_ratio * 0.25, 2))}

        # Disambiguate Gujlish
        if has_gujlish_phrase or (gujlish_hits > 0 and gujlish_hits >= hinglish_hits and (g_ratio >= 0.15 or gujlish_hits >= 2)):
            conf = min(0.98, round(0.70 + g_ratio * 0.25, 2))
            return {"language": "gu-Latn", "script": "Latin", "confidence": conf}

        # Disambiguate Hinglish
        if has_hinglish_phrase or (hinglish_hits > 0 and hinglish_hits > gujlish_hits and (h_ratio >= 0.15 or hinglish_hits >= 2)):
            conf = min(0.98, round(0.70 + h_ratio * 0.25, 2))
            return {"language": "hi-Latn", "script": "Latin", "confidence": conf}

        # If phrase matched but token ratio was low (e.g. single word "kyare che")
        if has_gujlish_phrase:
            return {"language": "gu-Latn", "script": "Latin", "confidence": 0.85}
        if has_hinglish_phrase:
            return {"language": "hi-Latn", "script": "Latin", "confidence": 0.85}

        # Default to English
        return {"language": "en", "script": "Latin", "confidence": 0.90}


language_detector = LanguageDetector()
