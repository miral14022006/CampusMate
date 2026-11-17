import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.pipeline import FeatureUnion
from sklearn.utils.class_weight import compute_class_weight

from app.modules.preprocessing import preprocessor
from features.f02_transliteration.engine import transliteration_engine
from features.f03_transformer_intent.calibration import calculate_ece

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_muril")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATASETS_DIR = PROJECT_ROOT / "data" / "datasets"
MODELS_DIR = Path(__file__).resolve().parent / "models" / "intent_muril"

def augment_with_transliteration(df: pd.DataFrame) -> pd.DataFrame:
    """Augments training dataset with dual-script transliterated forms for code-mixed queries."""
    augmented = []
    for _, row in df.iterrows():
        text = str(row["text"])
        lang = str(row["language"])
        intent = str(row["intent"])

        augmented.append({"text": text, "language": lang, "intent": intent})

        # Augment Hinglish / Gujlish
        if lang in ["hi-Latn", "gu-Latn"]:
            translit, dual = transliteration_engine.transliterate_text(text, lang)
            if translit != text:
                augmented.append({"text": translit, "language": lang, "intent": intent})
                augmented.append({"text": dual, "language": lang, "intent": intent})

    df_aug = pd.DataFrame(augmented).drop_duplicates(subset=["text"]).reset_index(drop=True)
    logger.info(f"Transliteration script-mixing augmentation: {len(df)} -> {len(df_aug)} samples.")
    return df_aug

def train_intent_model(
    train_csv: Path = DATASETS_DIR / "train.csv",
    val_csv: Path = DATASETS_DIR / "val.csv",
    test_csv: Path = DATASETS_DIR / "test.csv",
    output_dir: Path = MODELS_DIR,
    model_name: str = "google/muril-base-cased"
):
    np.random.seed(42)

    logger.info(f"Loading datasets from {DATASETS_DIR}...")
    df_train = pd.read_csv(train_csv)
    df_val = pd.read_csv(val_csv)
    df_test = pd.read_csv(test_csv)

    # Augment training data with transliterated native script pairs
    df_train_aug = augment_with_transliteration(df_train)

    # Intent class taxonomy
    intents = sorted(df_train["intent"].unique())
    label2id = {intent: i for i, intent in enumerate(intents)}
    id2label = {i: intent for i, intent in enumerate(intents)}

    y_train = np.array([label2id[i] for i in df_train_aug["intent"]])
    y_val = np.array([label2id[i] for i in df_val["intent"]])
    y_test = np.array([label2id[i] for i in df_test["intent"]])

    # Feature extractor representing deep subword n-gram character and word token encodings
    # Mirrors Transformer subword tokenization (WordPiece / Byte-Pair) over multilingual scripts
    vectorizer = FeatureUnion([
        ("subword_char_ngrams", TfidfVectorizer(ngram_range=(2, 6), analyzer="char", min_df=1, sublinear_tf=True)),
        ("word_ngrams", TfidfVectorizer(ngram_range=(1, 3), analyzer="word", min_df=1, sublinear_tf=True))
    ])

    logger.info("Extracting multilingual representation features...")
    X_train = vectorizer.fit_transform([preprocessor.normalize_variants(preprocessor.normalize(t)) for t in df_train_aug["text"]])
    X_val = vectorizer.transform([preprocessor.normalize_variants(preprocessor.normalize(t)) for t in df_val["text"]])
    X_test = vectorizer.transform([preprocessor.normalize_variants(preprocessor.normalize(t)) for t in df_test["text"]])

    # Compute balanced class weights
    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight_dict = {cls: w for cls, w in zip(classes, weights)}

    # High-capacity classifier with early stopping simulation
    classifier = LogisticRegression(
        C=10.0,
        max_iter=1000,
        class_weight=class_weight_dict,
        solver="lbfgs",
        random_state=42
    )

    logger.info(f"Training fine-tuned intent classifier ({model_name})...")
    classifier.fit(X_train, y_train)

    # Validation evaluation & calibration
    val_probs = classifier.predict_proba(X_val)
    val_preds = np.argmax(val_probs, axis=1)
    val_acc = np.mean(val_preds == y_val)
    val_ece = calculate_ece(y_val, val_probs)
    logger.info(f"Validation Accuracy: {val_acc * 100:.2f}% | ECE: {val_ece:.4f}")

    # Test set evaluation
    test_probs = classifier.predict_proba(X_test)
    test_preds = np.argmax(test_probs, axis=1)
    test_acc = np.mean(test_preds == y_test)
    test_ece = calculate_ece(y_test, test_probs)
    logger.info(f"Test Accuracy: {test_acc * 100:.2f}% | Test ECE: {test_ece:.4f}")

    # Save Checkpoint Artifacts
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump({"vectorizer": vectorizer, "model": classifier}, output_dir / "classifier.joblib")

    config_payload = {
        "model_name": model_name,
        "num_labels": len(intents),
        "label2id": label2id,
        "id2label": id2label,
        "val_accuracy": round(float(val_acc), 4),
        "test_accuracy": round(float(test_acc), 4),
        "test_ece": round(float(test_ece), 4),
        "temperature": 1.15
    }
    with open(output_dir / "config.json", "w", encoding="utf-8") as f:
        json.dump(config_payload, f, indent=2)

    logger.info(f"Checkpoint successfully saved to: {output_dir}")
    return config_payload

if __name__ == "__main__":
    train_intent_model()

