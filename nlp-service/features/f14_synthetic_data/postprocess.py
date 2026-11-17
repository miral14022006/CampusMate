import logging
from typing import List, Dict, Any, Tuple
import pandas as pd
from rapidfuzz import fuzz
from app.modules.language_detect import language_detector

logger = logging.getLogger("synthetic_data.postprocess")

class SyntheticDataPostprocessor:
    def __init__(self, fuzzy_sim_threshold: float = 88.0):
        self.fuzzy_sim_threshold = fuzzy_sim_threshold

    def exact_deduplicate(self, df: pd.DataFrame) -> pd.DataFrame:
        initial = len(df)
        df_clean = df.drop_duplicates(subset=["text"]).copy()
        logger.info(f"Exact deduplication removed {initial - len(df_clean)} duplicates.")
        return df_clean

    def fuzzy_deduplicate(self, df: pd.DataFrame) -> pd.DataFrame:
        """Deduplicates texts having fuzzy ratio > threshold within the same intent."""
        initial = len(df)
        kept_rows = []

        # Process per intent group for performance
        for intent, group in df.groupby("intent"):
            group_texts = []
            for _, row in group.iterrows():
                text = str(row["text"]).strip()
                is_duplicate = False
                for existing in group_texts:
                    sim = fuzz.ratio(text.lower(), existing.lower())
                    if sim >= self.fuzzy_sim_threshold:
                        is_duplicate = True
                        break
                if not is_duplicate:
                    group_texts.append(text)
                    kept_rows.append(row)

        df_dedup = pd.DataFrame(kept_rows)
        logger.info(f"Fuzzy deduplication removed {initial - len(df_dedup)} near-duplicate queries.")
        return df_dedup

    def validate_languages(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
        """Validates predicted language against annotated language and drops mismatches."""
        initial = len(df)
        valid_rows = []
        dropped_count = 0

        for _, row in df.iterrows():
            text = str(row["text"])
            claimed_lang = row["language"]

            # Run baseline detector
            pred = language_detector.detect(text)
            pred_lang = pred["language"]

            # Allow exact match or compatibility between transliterated and root forms if high confidence
            is_valid = False
            if pred_lang == claimed_lang:
                is_valid = True
            elif claimed_lang == "hi-Latn" and pred_lang in ["hi-Latn", "en"] and any(w in text.lower() for w in ["kya", "kab", "hai", "kaise", "bhai", "kitna"]):
                is_valid = True
            elif claimed_lang == "gu-Latn" and pred_lang in ["gu-Latn", "en"] and any(w in text.lower() for w in ["shu", "che", "chhe", "kyare", "mate", "ketli"]):
                is_valid = True

            if is_valid:
                valid_rows.append(row)
            else:
                dropped_count += 1

        df_valid = pd.DataFrame(valid_rows)
        logger.info(f"Language verification dropped {dropped_count} mislabeled/unverifiable rows.")
        return df_valid, dropped_count

    def balance_classes(self, df: pd.DataFrame, target_per_intent: int = None) -> pd.DataFrame:
        """Balances distribution across intents and languages."""
        if target_per_intent is None:
            # Determine minimum representation or reasonable cap
            counts = df["intent"].value_counts()
            target_per_intent = int(counts.quantile(0.85))

        balanced_groups = []
        for intent, group in df.groupby("intent"):
            if len(group) > target_per_intent:
                balanced_groups.append(group.sample(n=target_per_intent, random_state=42))
            else:
                balanced_groups.append(group)

        df_balanced = pd.concat(balanced_groups).sample(frac=1.0, random_state=42).reset_index(drop=True)
        return df_balanced

postprocessor = SyntheticDataPostprocessor()

