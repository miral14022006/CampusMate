import unicodedata
import re
import json
from typing import List, Dict, Set, Any
from app.config import STOPWORDS_DIR, LEXICONS_DIR

class Preprocessor:
    def __init__(self):
        self.variants: Dict[str, str] = self._load_variants()
        self.stopwords: Dict[str, Set[str]] = self._load_stopwords()

    def _load_variants(self) -> Dict[str, str]:
        variant_file = LEXICONS_DIR / "variants.json"
        if variant_file.exists():
            try:
                with open(variant_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _load_stopwords(self) -> Dict[str, Set[str]]:
        stopwords = {"en": set(), "hi": set(), "gu": set()}
        for lang in ["en", "hi", "gu"]:
            sw_file = STOPWORDS_DIR / f"{lang}.txt"
            if sw_file.exists():
                with open(sw_file, "r", encoding="utf-8") as f:
                    words = {line.strip().lower() for line in f if line.strip()}
                    stopwords[lang] = words
        return stopwords

    def normalize(self, text: str) -> str:
        """
        Normalizes Unicode and cleans extraneous control characters while carefully preserving
        meaningful punctuation, math/currency symbols, and Indic script characters.
        """
        if not text:
            return ""
        # Unicode NFC normalization
        normalized = unicodedata.normalize("NFC", text)
        # Strip extraneous control symbols while preserving Indic scripts, Latin, numbers,
        # and essential punctuation: ? . , ! : ; - / ( ) [ ] % ₹ $ | @ & + =
        cleaned = re.sub(r'[^\w\s\u0900-\u097F\u0A80-\u0AFF\?\.\,\!\:\;\-\/\(\)\[\]\%₹\$\|\@\&\+\=]', ' ', normalized)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def normalize_for_retrieval(self, text: str) -> str:
        """
        Aggressive cleanup for BM25 and dense embedding keyword matching (strips punctuation).
        """
        if not text:
            return ""
        normalized = unicodedata.normalize("NFC", text)
        cleaned = re.sub(r'[^\w\s\u0900-\u097F\u0A80-\u0AFF\-]', ' ', normalized)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def normalize_variants(self, text: str) -> str:
        """Standardizes colloquial phonetic spelling variants (kab/kb, kyu/kyun, kya/kia)."""
        if not text:
            return ""
        tokens = text.split()
        normalized_tokens = []
        for token in tokens:
            lower = token.lower()
            if lower in self.variants:
                normalized_tokens.append(self.variants[lower])
            else:
                normalized_tokens.append(lower)
        return " ".join(normalized_tokens)

    def tokenize(self, text: str) -> List[str]:
        """Simple whitespace and punctuation-safe tokenization."""
        normalized = self.normalize(text)
        # Tokenize by alphanumeric blocks
        tokens = re.findall(r'[\u0900-\u097F]+|[\u0A80-\u0AFF]+|[a-zA-Z0-9]+', normalized)
        return tokens

    def remove_stopwords(self, tokens: List[str], lang: str = "en") -> List[str]:
        target_lang = "en"
        if lang in ["hi", "hi-Latn"]:
            target_lang = "hi"
        elif lang in ["gu", "gu-Latn"]:
            target_lang = "gu"

        sw = self.stopwords.get(target_lang, set())
        # Also include English stopwords for transliterated Hinglish/Gujlish
        sw_en = self.stopwords.get("en", set())
        return [t for t in tokens if t.lower() not in sw and t.lower() not in sw_en]

    def preprocess(self, text: str) -> Dict[str, Any]:
        normalized = self.normalize(text)
        variants_fixed = self.normalize_variants(normalized)
        tokens = self.tokenize(variants_fixed)
        retrieval_query = self.normalize_for_retrieval(variants_fixed)
        return {
            "raw": text,
            "normalized": variants_fixed,
            "retrieval_query": retrieval_query,
            "tokens": tokens
        }

preprocessor = Preprocessor()
