import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
# DATA_DIR is overridable so production keeps mutable state on its mounted volume.
_data_dir_env = os.getenv("DATA_DIR")
DATA_DIR = Path(_data_dir_env).expanduser().resolve() if _data_dir_env else (PROJECT_ROOT / "data")

LEXICONS_DIR = DATA_DIR / "lexicons"
STOPWORDS_DIR = DATA_DIR / "stopwords"
PATTERNS_DIR = DATA_DIR / "patterns"
DATASETS_DIR = DATA_DIR / "datasets"
INDEX_DIR = DATA_DIR / "index"
TEMPLATES_DIR = DATA_DIR / "templates"
RAW_DOCS_DIR = DATA_DIR / "raw"
# Runtime chunk metadata lives next to the index so it is persisted on the index volume.
_chunks_file_env = os.getenv("CHUNKS_FILE")
CHUNKS_FILE = Path(_chunks_file_env).expanduser().resolve() if _chunks_file_env else (DATA_DIR / "processed" / "chunks.json")

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
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "8"))

# Neighboring chunk expansion: how many chunks before/after a hit to include
NEIGHBOR_CHUNK_WINDOW = int(os.getenv("NEIGHBOR_CHUNK_WINDOW", "1"))

# Maximum context tokens to send to LLM (reserve ~2000 for answer)
MAX_CONTEXT_TOKENS = int(os.getenv("MAX_CONTEXT_TOKENS", "6000"))

# Conversation history: max prior turns to include in LLM prompt
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "5"))

