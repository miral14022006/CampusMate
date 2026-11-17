import os
import json
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from app.core.config import LOG_DIR

LOG_DIR.mkdir(parents=True, exist_ok=True)
log_file = LOG_DIR / "nlp_service.log"

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id
        if hasattr(record, "stage_latencies"):
            log_obj["stage_latencies_ms"] = record.stage_latencies
        if hasattr(record, "query_metadata"):
            log_obj["query_metadata"] = record.query_metadata
        return json.dumps(log_obj)

def setup_logger(name: str = "nlp_service") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        # Rotating File Handler (10MB max, keep 5 backups)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8"
        )
        file_handler.setFormatter(JSONFormatter())
        file_handler.setLevel(logging.INFO)

        # Stream Handler for console / docker logs
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(JSONFormatter())
        console_handler.setLevel(logging.INFO)

        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger

structured_logger = setup_logger()

