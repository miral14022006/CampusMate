import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"

LEXICONS_DIR = DATA_DIR / "lexicons"
STOPWORDS_DIR = DATA_DIR / "stopwords"
PATTERNS_DIR = DATA_DIR / "patterns"
DATASETS_DIR = DATA_DIR / "datasets"
INDEX_DIR = DATA_DIR / "index"
TEMPLATES_DIR = DATA_DIR / "templates"
RAW_DOCS_DIR = DATA_DIR / "raw"

# Artifacts
INTENT_MODEL_PATH = INDEX_DIR / "intent_classifier.joblib"
INTENT_VECTORIZER_PATH = INDEX_DIR / "intent_vectorizer.joblib"
RETRIEVAL_INDEX_PATH = INDEX_DIR / "tfidf_retrieval.joblib"
INTENTS_JSON_PATH = DATA_DIR / "intents.json"

# Features Configuration
FEATURES_CONFIG_PATH = BASE_DIR.parent / "config" / "features.json"

# API & Security
API_VERSION = "1.0.0"
NLP_API_KEY = os.getenv("NLP_API_KEY", "campus_mate_secret_token_123")
API_KEY_HEADER_NAME = "X-API-Key"
LOG_DIR = BASE_DIR / "logs"

# Pipeline Parameters
INTENT_CONFIDENCE_THRESHOLD = float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", "0.35"))
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "3"))

