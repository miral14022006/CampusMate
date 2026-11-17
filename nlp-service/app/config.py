import os
from pathlib import Path

# Paths
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

# Intent Classification Config
INTENT_MODEL_PATH = INDEX_DIR / "intent_classifier.joblib"
INTENT_VECTORIZER_PATH = INDEX_DIR / "intent_vectorizer.joblib"
INTENTS_JSON_PATH = DATA_DIR / "intents.json"
SEED_QUERIES_PATH = DATASETS_DIR / "seed_queries.csv"

# Retrieval Index Config
RETRIEVAL_INDEX_PATH = INDEX_DIR / "tfidf_retrieval.joblib"

# Feature Flags Path
FEATURES_CONFIG_PATH = BASE_DIR / "config" / "features.json"

# Thresholds
INTENT_CONFIDENCE_THRESHOLD = float(os.getenv("INTENT_CONFIDENCE_THRESHOLD", "0.35"))
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "3"))

