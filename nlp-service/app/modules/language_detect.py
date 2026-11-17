import re
from pathlib import Path
from typing import Dict, Any, Set
from app.config import LEXICONS_DIR

class LanguageDetector:
    def __init__(self):
        self.hinglish_words: Set[str] = self._load_wordlist(LEXICONS_DIR / "hinglish_words.txt")
        self.gujlish_words: Set[str] = self._load_wordlist(LEXICONS_DIR / "gujlish_words.txt")

    def _load_wordlist(self, filepath: Path) -> Set[str]:
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                return {line.strip().lower() for line in f if line.strip()}
        return set()

    def detect(self, text: str) -> Dict[str, Any]:
        """
        Detects script and language.
        Returns: { 'language': str, 'script': str, 'confidence': float }
        Language codes: 'en', 'hi', 'gu', 'hi-Latn', 'gu-Latn'.
        """
        cleaned = text.strip()
        if not cleaned:
            return {"language": "en", "script": "Latin", "confidence": 1.0}

        devanagari_count = len(re.findall(r'[\u0900-\u097F]', cleaned))
        gujarati_count = len(re.findall(r'[\u0A80-\u0AFF]', cleaned))
        latin_count = len(re.findall(r'[a-zA-Z]', cleaned))
        total_letters = devanagari_count + gujarati_count + latin_count

        if total_letters == 0:
            return {"language": "en", "script": "Latin", "confidence": 0.5}

        # 1. Native script detection
        if devanagari_count / total_letters > 0.35:
            conf = min(0.99, round((devanagari_count / total_letters) + 0.1, 2))
            return {"language": "hi", "script": "Devanagari", "confidence": conf}

        if gujarati_count / total_letters > 0.35:
            conf = min(0.99, round((gujarati_count / total_letters) + 0.1, 2))
            return {"language": "gu", "script": "Gujarati", "confidence": conf}

        # 2. Latin script classification (English vs Hinglish vs Gujlish)
        tokens = [t.lower() for t in re.findall(r'[a-zA-Z]+', cleaned)]
        if not tokens:
            return {"language": "en", "script": "Latin", "confidence": 0.5}

        hinglish_hits = sum(1 for t in tokens if t in self.hinglish_words)
        gujlish_hits = sum(1 for t in tokens if t in self.gujlish_words)

        h_score = hinglish_hits / len(tokens)
        g_score = gujlish_hits / len(tokens)

        if g_score > 0.15 and g_score >= h_score:
            conf = min(0.98, round(0.60 + g_score, 2))
            return {"language": "gu-Latn", "script": "Latin", "confidence": conf}
        elif h_score > 0.15 and h_score > g_score:
            conf = min(0.98, round(0.60 + h_score, 2))
            return {"language": "hi-Latn", "script": "Latin", "confidence": conf}
        else:
            return {"language": "en", "script": "Latin", "confidence": 0.90}

language_detector = LanguageDetector()

