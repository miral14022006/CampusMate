import unicodedata
import re
from typing import List, Tuple

# Comprehensive multilingual stopwords
EN_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
    "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "could", "did", "do",
    "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have", "having",
    "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it",
    "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", "should", "so",
    "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these",
    "they", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
    "when", "where", "which", "while", "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself"
}

HI_STOPWORDS = {
    "का", "के", "की", "को", "में", "से", "पर", "है", "हैं", "था", "थी", "थे", "और", "या", "तो", "भी", "ही", "ने",
    "यह", "वह", "इस", "उस", "कि", "जो", "कर", "किया", "रहे", "रही", "रहा", "हुआ", "हुए", "हुई", "तक", "लिए",
    "अपने", "अपनी", "अपना", "सकते", "सकती", "सकता"
}

GU_STOPWORDS = {
    "અને", "કે", "છે", "હતા", "હતી", "હતો", "થી", "માં", "પર", "માટે", "પણ", "તો", "જ", "આ", "તે", "એ", "જે",
    "કરી", "કરવા", "થાય", "થઈ", "સાથે", "દ્વારા", "સુધી", "રીતે", "કોઈ", "બધા"
}

# Romanized Hinglish/Gujlish Slang & Spelling Normalizer mapping
SLANG_MAP = {
    # Hinglish
    "kb": "kab", "kbb": "kab",
    "kyu": "kyun", "q": "kyun", "kyn": "kyun",
    "kya": "kya", "kia": "kya", "kyaa": "kya",
    "h": "hai", "hie": "hai", "ha": "hai",
    "b": "bhi", "bh": "bhi",
    "btado": "batao", "btao": "batao", "bata do": "batao",
    "plz": "please", "pls": "please",
    "sem": "semester", "dept": "department",
    # Gujlish
    "su": "shu", "sh": "shu", "soo": "shu",
    "che": "chhe", "ch": "chhe",
    "kem": "kem", "km": "kem",
    "kare": "kyaare", "kyare": "kyaare",
    "aapo": "aapo", "bolo": "bolo"
}

def normalize_unicode(text: str) -> str:
    """Normalize text using NFKC standard."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    return text.strip()

def clean_text(text: str) -> str:
    """Clean emojis, redundant spaces, and non-printable characters."""
    if not text:
        return ""
    text = normalize_unicode(text)
    # Remove control characters and non-printable unicode while preserving Devanagari, Gujarati, Latin
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_slang(text: str) -> str:
    """Normalize common romanized Hindi/Gujarati slang and abbreviations."""
    tokens = text.split()
    normalized = []
    for t in tokens:
        t_lower = t.lower()
        if t_lower in SLANG_MAP:
            normalized.append(SLANG_MAP[t_lower])
        else:
            normalized.append(t)
    return " ".join(normalized)

def tokenize(text: str) -> List[str]:
    """Tokenize text preserving words and alphanumeric tokens across scripts."""
    # Matches Latin words, Devanagari words, Gujarati words, and numbers
    pattern = r'[a-zA-Z0-9]+|[\u0900-\u097F]+|[\u0A80-\u0AFF]+'
    return re.findall(pattern, text)

def remove_stopwords(tokens: List[str], language: str = "en") -> List[str]:
    """Remove language-specific stopwords."""
    stopwords = set()
    if language == "en":
        stopwords = EN_STOPWORDS
    elif language in ["hi", "hinglish"]:
        stopwords = HI_STOPWORDS | EN_STOPWORDS
    elif language in ["gu", "gujlish"]:
        stopwords = GU_STOPWORDS | EN_STOPWORDS
    else:
        stopwords = EN_STOPWORDS

    return [t for t in tokens if t.lower() not in stopwords and len(t) > 1]
