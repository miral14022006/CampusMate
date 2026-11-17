import sys
import argparse
import joblib
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion

from app.config import (
    INTENT_MODEL_PATH,
    INTENT_VECTORIZER_PATH,
    SEED_QUERIES_PATH,
    INTENT_CONFIDENCE_THRESHOLD,
    INDEX_DIR
)
from app.modules.preprocessing import preprocessor

class IntentClassifierBaseline:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.load()

    def train(self, dataset_path: Path = SEED_QUERIES_PATH):
        print(f"[Intent] Loading training data from: {dataset_path}")
        df = pd.read_csv(dataset_path)

        # Preprocess text
        cleaned_texts = [
            preprocessor.normalize_variants(preprocessor.normalize(q))
            for q in df["query"].astype(str)
        ]
        labels = df["intent"].tolist()

        # Hybrid Char + Word n-gram TF-IDF vectorizer
        # Critical for catching subword transliteration roots in Hinglish/Gujlish
        self.vectorizer = FeatureUnion([
            ("word_tfidf", TfidfVectorizer(ngram_range=(1, 2), analyzer="word", min_df=1)),
            ("char_tfidf", TfidfVectorizer(ngram_range=(3, 5), analyzer="char", min_df=1))
        ])

        X = self.vectorizer.fit_transform(cleaned_texts)

        # Logistic Regression with balanced class weights
        self.model = LogisticRegression(
            C=5.0,
            max_iter=500,
            class_weight="balanced",
            random_state=42
        )
        self.model.fit(X, labels)

        # Save artifacts
        INDEX_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.vectorizer, INTENT_VECTORIZER_PATH)
        joblib.dump(self.model, INTENT_MODEL_PATH)
        print(f"[Intent] Baseline model saved to: {INTENT_MODEL_PATH}")

    def load(self):
        if INTENT_MODEL_PATH.exists() and INTENT_VECTORIZER_PATH.exists():
            try:
                self.vectorizer = joblib.load(INTENT_VECTORIZER_PATH)
                self.model = joblib.load(INTENT_MODEL_PATH)
            except Exception as e:
                print(f"[Intent] Warning: Could not load intent model: {e}")
                self.model = None
                self.vectorizer = None

    def predict(self, text: str) -> dict:
        if self.model is None or self.vectorizer is None:
            return {
                "intent": "out_of_scope",
                "confidence": 0.0,
                "is_fallback": True
            }

        cleaned = preprocessor.normalize_variants(preprocessor.normalize(text))
        X = self.vectorizer.transform([cleaned])
        probas = self.model.predict_proba(X)[0]
        max_idx = probas.argmax()
        top_intent = self.model.classes_[max_idx]
        confidence = float(probas[max_idx])

        if confidence < INTENT_CONFIDENCE_THRESHOLD:
            return {
                "intent": "out_of_scope",
                "confidence": round(confidence, 3),
                "is_fallback": True
            }

        return {
            "intent": top_intent,
            "confidence": round(confidence, 3),
            "is_fallback": False
        }

intent_classifier = IntentClassifierBaseline()

def main():
    parser = argparse.ArgumentParser(description="Intent Baseline CLI")
    parser.add_argument("action", choices=["train", "predict"], help="Action to perform")
    parser.add_argument("query", nargs="?", default="", help="Query to predict when action is predict")
    args = parser.parse_args()

    classifier = IntentClassifierBaseline()
    if args.action == "train":
        classifier.train()
    elif args.action == "predict":
        if not args.query:
            print("Please provide a query: python -m app.modules.intent_baseline predict 'query'")
            sys.exit(1)
        res = classifier.predict(args.query)
        print(f"Query: '{args.query}'")
        print(f"Predicted Intent: {res['intent']} (Confidence: {res['confidence']:.3f}, Fallback: {res['is_fallback']})")

if __name__ == "__main__":
    main()

