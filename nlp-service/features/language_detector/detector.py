"""
Language Detector Module:
Identifies English ('en'), Hindi ('hi'), Gujarati ('gu'), Hinglish ('hi-Latn'), and Gujlish ('gu-Latn').
Uses script range heuristics and character n-gram/marker dictionary matching.
"""
import re
from typing import Dict, Any

class LanguageDetector:
    # Common transliteration lexicons
    HINGLISH_MARKERS = {
        "kya", "kab", "kaise", "kyu", "kyun", "kaha", "kahan", "hai", "hain", "ho", "hu", "hoon",
        "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "bhi", "aur", "ya", "nahi", "nahin",
        "mat", "ab", "kab", "jab", "tab", "mera", "meri", "mere", "aap", "aapka", "aapki", "tum",
        "tumhara", "hum", "hamara", "admission", "fees", "exam", "college", "kitna", "kitni", "batao",
        "chahiye", "hoga", "hogi", "honge", "karna", "karo", "sakte", "sakta", "sakti", "raha", "rahi"
    }

    GUJLISH_MARKERS = {
        "shu", "kem", "kyare", "kya", "kyathi", "che", "cho", "chu", "chhe", "chho", "chhu",
        "no", "ni", "nu", "na", "ne", "thi", "ma", "par", "pan", "ane", "athva", "nathi",
        "maru", "mari", "maro", "tamaru", "tamari", "tamaro", "ame", "amaru", "tame", "tamare",
        "ketli", "ketlo", "ketlu", "aapse", "malse", "karvu", "karvano", "karvani", "hova", "joyiye",
        "college", "fees", "admission", "karo", "batavo", "laavo", "mate", "kadvava", "padse", "javu"
    }

    @classmethod
    def detect(cls, text: str) -> Dict[str, Any]:
        """
        Detects primary language and returns language code, confidence, and script details.
        Supported codes: 'en', 'hi', 'gu', 'hi-Latn', 'gu-Latn'.
        """
        cleaned = text.strip()
        if not cleaned:
            return {"language": "en", "confidence": 1.0, "is_transliterated": False}

        # Count character scripts
        devanagari_count = len(re.findall(r'[\u0900-\u097F]', cleaned))
        gujarati_count = len(re.findall(r'[\u0A80-\u0AFF]', cleaned))
        latin_count = len(re.findall(r'[a-zA-Z]', cleaned))
        total_letters = devanagari_count + gujarati_count + latin_count

        if total_letters == 0:
            return {"language": "en", "confidence": 0.5, "is_transliterated": False}

        devanagari_ratio = devanagari_count / total_letters
        gujarati_ratio = gujarati_count / total_letters

        # Script-based detection for native scripts
        if devanagari_ratio > 0.35:
            conf = min(0.99, round(devanagari_ratio + 0.1, 2))
            return {"language": "hi", "confidence": conf, "is_transliterated": False}

        if gujarati_ratio > 0.35:
            conf = min(0.99, round(gujarati_ratio + 0.1, 2))
            return {"language": "gu", "confidence": conf, "is_transliterated": False}

        # If predominantly Latin script, distinguish between English, Hinglish, and Gujlish
        tokens = [t.lower() for t in re.findall(r'[a-zA-Z]+', cleaned)]
        if not tokens:
            return {"language": "en", "confidence": 0.5, "is_transliterated": False}

        hinglish_hits = sum(1 for t in tokens if t in cls.HINGLISH_MARKERS)
        gujlish_hits = sum(1 for t in tokens if t in cls.GUJLISH_MARKERS)

        h_ratio = hinglish_hits / len(tokens)
        g_ratio = gujlish_hits / len(tokens)

        # Classification decision based on relative marker density
        if g_ratio > 0.15 and g_ratio >= h_ratio:
            conf = min(0.95, round(0.6 + g_ratio, 2))
            return {"language": "gu-Latn", "confidence": conf, "is_transliterated": True}
        elif h_ratio > 0.15 and h_ratio > g_ratio:
            conf = min(0.95, round(0.6 + h_ratio, 2))
            return {"language": "hi-Latn", "confidence": conf, "is_transliterated": True}
        else:
            return {"language": "en", "confidence": 0.88, "is_transliterated": False}
