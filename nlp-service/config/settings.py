import json
import logging
import os
from pathlib import Path

logger = logging.getLogger("nlp_service")

class Settings:
    def __init__(self):
        self.app_env: str = os.getenv("APP_ENV", "development")
        self.port: int = int(os.getenv("PORT", 8000))
        self.features_config_path: str = os.getenv(
            "FEATURES_CONFIG_PATH",
            str(Path(__file__).parent.parent / "config" / "features.json")
        )

settings = Settings()

def load_feature_flags() -> dict[str, bool]:
    path = Path(settings.features_config_path)
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading feature flags: {e}")
    return {}

def is_feature_enabled(feature_name: str, default: bool = False) -> bool:
    flags = load_feature_flags()
    return flags.get(feature_name, default)
