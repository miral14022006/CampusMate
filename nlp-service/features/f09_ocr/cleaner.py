import re
import json
import unicodedata
from pathlib import Path
from typing import Dict, Any, Optional

class PostOCRCleaner:
    """
    Cleans raw OCR output:
    1. Unicode NFC normalization.
    2. Strips stray non-printable ASCII noise and orphan symbols (~, |, §, ¬).
    3. Devanagari and Gujarati common character/spelling confusion correction dictionary.
    4. Collapses accidental broken lines within paragraphs.
    """

    def __init__(self, fixes_path: Optional[Path] = None):
        curr = Path(__file__).resolve().parent
        base_dir = None
        for _ in range(5):
            if (curr / "data" / "lexicons" / "ocr_fixes.json").exists():
                base_dir = curr
                break
            curr = curr.parent
        if not base_dir:
            base_dir = Path.cwd()

        self.fixes_path = fixes_path or (base_dir / "data" / "lexicons" / "ocr_fixes.json")
        self.fixes = self._load_fixes()

    def _load_fixes(self) -> Dict[str, Dict[str, str]]:
        if self.fixes_path.exists():
            try:
                with open(self.fixes_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def clean(self, text: str) -> str:
        if not text:
            return ""

        # 1. Unicode NFC normalization
        normalized = unicodedata.normalize("NFC", text)

        # 2. Remove stray artifacts (e.g. isolated pipe characters, tildes, weird symbols)
        cleaned = re.sub(r"[|~¬_§^•]{2,}", " ", normalized)
        cleaned = re.sub(r"(?<=\s)[|¬~](?=\s)", " ", cleaned)

        # 3. Collapse broken line breaks inside sentences (e.g. "submit your \n form" -> "submit your form")
        paragraphs = cleaned.split("\n\n")
        reconstructed = []
        for p in paragraphs:
            lines = p.split("\n")
            collapsed_p = []
            for l in lines:
                l_str = l.strip()
                if not l_str:
                    continue
                # If ends with hyphen, strip and merge
                if l_str.endswith("-"):
                    collapsed_p.append(l_str[:-1])
                else:
                    collapsed_p.append(l_str + " ")
            reconstructed.append("".join(collapsed_p).strip())

        result = "\n\n".join([p for p in reconstructed if p])

        # 4. Apply Indic & English OCR correction lexicons
        for cat in ["devanagari_fixes", "gujarati_fixes", "english_fixes"]:
            cat_fixes = self.fixes.get(cat, {})
            for mistake, correction in cat_fixes.items():
                if cat == "english_fixes":
                    pattern = r"\b" + re.escape(mistake) + r"\b"
                    result = re.sub(pattern, correction, result)
                else:
                    # Indic scripts (Devanagari, Gujarati) word boundary support
                    pattern = r"(?:^|\s|[.,!?;:])(" + re.escape(mistake) + r")(?=$|\s|[.,!?;:])"
                    result = re.sub(pattern, lambda m: m.group(0).replace(m.group(1), correction), result)

        return result.strip()

post_ocr_cleaner = PostOCRCleaner()
