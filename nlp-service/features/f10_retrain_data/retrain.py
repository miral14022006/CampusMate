import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from features.f03_transformer_intent.train import train_intent_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("retrain_pipeline")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "data" / "datasets"
MODELS_DIR = PROJECT_ROOT / "nlp-service" / "features" / "f03_transformer_intent" / "models" / "intent_muril"

def run_retrain(
    train_csv: Path = DATASETS_DIR / "train_merged.csv",
    val_csv: Path = DATASETS_DIR / "val.csv",
    test_csv: Path = DATASETS_DIR / "test.csv",
    output_dir: Path = MODELS_DIR,
    version_tag: str = None
) -> Dict[str, Any]:
    """
    Retrains the intent classifier using the merged feedback training data,
    computes test metrics, and writes version metadata.
    """
    if not train_csv.exists():
        logger.warning(f"{train_csv} not found, falling back to baseline train.csv")
        train_csv = DATASETS_DIR / "train.csv"

    if not version_tag:
        version_tag = f"model_v2_feedback_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"

    logger.info(f"Initiating retrain pipeline with {train_csv} -> tag: {version_tag}")
    
    # Train intent model with augmented code-mixed forms
    metrics = train_intent_model(
        train_csv=train_csv,
        val_csv=val_csv,
        test_csv=test_csv,
        output_dir=output_dir,
        model_name="google/muril-base-cased"
    )
    
    metrics["model_version"] = version_tag
    metrics["trained_at"] = datetime.utcnow().isoformat()
    metrics["training_source"] = str(train_csv.name)
    
    # Persist version manifest
    version_file = output_dir / "model_version.json"
    with open(version_file, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
        
    logger.info(f"Retrained model {version_tag} saved successfully to {output_dir}")
    return metrics

if __name__ == "__main__":
    run_retrain()

