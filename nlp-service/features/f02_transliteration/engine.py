import re
import json
import logging
from pathlib import Path
from functools import lru_cache
from typing import Dict, Any, Tuple

logger = logging.getLogger("nlp_service.transliteration")

# Try optional AI4Bharat IndicXlit import
try:
    from ai4bharat.transliteration import XlitEngine
    INDIC_XLIT_AVAILABLE = True
except Exception:
    INDIC_XLIT_AVAILABLE = False

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
LEXICONS_DIR = DATA_DIR / "lexicons"

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
        """Determines if a token should remain in English (technical/college vocabulary)."""
        clean = token.lower().strip()
        if not clean or clean.isdigit():
            return True
        if clean in self.english_vocab:
            return True
        # Common English morphological patterns
        if clean.endswith("ing") or clean.endswith("ed") or clean.endswith("tion") or clean.endswith("able"):
            return True
        return False

    @lru_cache(maxsize=10000)
    def transliterate_token(self, token: str, lang: str) -> str:
        """
        Translates a single romanized word to target script (hi or gu)
        with LRU cache acceleration.
        """
        clean_token = token.lower().strip()
        if not clean_token:
            return token

        # 1. Do not transliterate English college technical terms
        if self.is_english_token(clean_token):
            return token

        rules = self.hi_rules if lang in ["hi", "hi-Latn"] else self.gu_rules
        words_dict = rules.get("words", {})

        # 2. Check curated collegiate lexicon dictionary
        if clean_token in words_dict:
            return words_dict[clean_token]

        # 3. Use AI4Bharat IndicXlit if available
        if self.xlit_engine:
            try:
                target_lang = "hi" if lang in ["hi", "hi-Latn"] else "gu"
                res = self.xlit_engine.translit_word(clean_token, lang_code=target_lang)
                if res and isinstance(res, list) and len(res) > 0:
                    return res[0]
            except Exception:
                pass

        # 4. Deterministic phonetic rule-based transliteration fallback
        consonants = rules.get("consonants", {})
        vowels = rules.get("vowels", {})

        chars = []
        i = 0
        n = len(clean_token)

        while i < n:
            # Check 3-char prefix
            if i + 3 <= n and clean_token[i:i+3] in consonants:
                chars.append(consonants[clean_token[i:i+3]])
                i += 3
            # Check 2-char prefix
            elif i + 2 <= n and clean_token[i:i+2] in consonants:
                chars.append(consonants[clean_token[i:i+2]])
                i += 2
            elif i + 2 <= n and clean_token[i:i+2] in vowels:
                chars.append(vowels[clean_token[i:i+2]])
                i += 2
            # 1-char match
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
        """
        Processes mixed query token-by-token.
        Returns:
            transliterated: Native script for Indic tokens + English intact.
            dual_form: Concatenation of original text + transliterated text for high-recall hybrid matching.
        """
        if not text or lang not in ["hi-Latn", "gu-Latn", "hi", "gu"]:
            return text, text

        tokens = text.split()
        transliterated_tokens = []

        for token in tokens:
            # Strip punctuation for lookup but restore
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
        # Dual form combines both representations for maximum lexical + semantic overlap
        dual_form = f"{text} {transliterated}".strip()

        return transliterated, dual_form

transliteration_engine = TransliterationEngine()

