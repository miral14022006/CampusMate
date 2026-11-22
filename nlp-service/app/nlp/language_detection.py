import re
from typing import Dict, Any, List

# Distinct lexical sets for Romanized Hinglish vs Gujlish vs English
HINGLISH_WORDS = {
    "kya", "kab", "kaise", "kyun", "kaha", "kahan", "kitna", "kitni", "hai", "hain", "ho", "hu", "hoon",
    "bharne", "bharu", "bharo", "karne", "karo", "kare", "karna", "aaye", "aayega", "hoga", "hogi", "hoge",
    "batao", "batado", "bataye", "mujhe", "mera", "meri", "mere", "apna", "apne", "apni", "ka", "ki", "ke",
    "ko", "se", "par", "pe", "mein", "aur", "ya", "bhi", "sirf", "nahi", "nahin", "matlab", "shuru", "khatam",
    "paisa", "paise", "form", "tarikh", "samay", "din", "chutti", "kamra", "khana", "pariksha"
}

GUJLISH_WORDS = {
    "shu", "su", "chhe", "che", "kem", "kyaare", "kyare", "kya", "kyan", "ketlu", "ketla", "aave", "aavse",
    "bharvani", "bharo", "karvani", "karo", "kare", "aapo", "batavo", "mane", "maru", "mari", "mara", "tamaru",
    "no", "ni", "nu", "na", "ne", "thi", "ma", "par", "ane", "pan", "nathi", "sharu", "patse", "tarikh",
    "samay", "divas", "raja", "chhutti", "room", "khorak", "pariksha", "hova", "joyiye", "lejo"
}

def detect_script(text: str) -> str:
    """Detect dominant script using exact Unicode ranges."""
    has_devanagari = bool(re.search(r'[\u0900-\u097F]', text))
    has_gujarati = bool(re.search(r'[\u0A80-\u0AFF]', text))
    has_latin = bool(re.search(r'[a-zA-Z]', text))

    scripts = []
    if has_devanagari: scripts.append("devanagari")
    if has_gujarati: scripts.append("gujarati")
    if has_latin: scripts.append("latin")

    if len(scripts) == 0:
        return "unknown"
    if len(scripts) == 1:
        return scripts[0]
    return "mixed"

def detect_language(text: str) -> Dict[str, Any]:
    """
    Detect language distinguishing:
    en, hi, gu, hinglish, gujlish, mixed, unknown.
    """
    if not text or not text.strip():
        return {
            "language": "unknown",
            "script": "unknown",
            "confidence": 0.0,
            "detected_tokens": []
        }

    script = detect_script(text)
    
    # Direct Devanagari script detection
    if script == "devanagari":
        return {
            "language": "hi",
            "script": "devanagari",
            "confidence": 0.99,
            "detected_tokens": re.findall(r'[\u0900-\u097F]+', text)
        }

    # Direct Gujarati script detection
    if script == "gujarati":
        return {
            "language": "gu",
            "script": "gujarati",
            "confidence": 0.99,
            "detected_tokens": re.findall(r'[\u0A80-\u0AFF]+', text)
        }

    # Latin Script: Distinguish English, Hinglish, Gujlish
    words = [w.lower() for w in re.findall(r'[a-zA-Z]+', text)]
    if not words:
        return {
            "language": "unknown",
            "script": script,
            "confidence": 0.0,
            "detected_tokens": []
        }

    hinglish_matches = [w for w in words if w in HINGLISH_WORDS]
    gujlish_matches = [w for w in words if w in GUJLISH_WORDS]

    total_words = len(words)
    hinglish_ratio = len(hinglish_matches) / total_words
    gujlish_ratio = len(gujlish_matches) / total_words

    if gujlish_matches and len(gujlish_matches) >= len(hinglish_matches):
        return {
            "language": "gujlish",
            "script": "latin",
            "confidence": min(1.0, 0.6 + gujlish_ratio * 0.4),
            "detected_tokens": gujlish_matches
        }

    if hinglish_matches:
        return {
            "language": "hinglish",
            "script": "latin",
            "confidence": min(1.0, 0.6 + hinglish_ratio * 0.4),
            "detected_tokens": hinglish_matches
        }

    # Mixed script check
    if script == "mixed":
        return {
            "language": "mixed",
            "script": "mixed",
            "confidence": 0.85,
            "detected_tokens": words
        }

    # Default to English
    return {
        "language": "en",
        "script": "latin",
        "confidence": 0.95,
        "detected_tokens": words[:5]
    }
