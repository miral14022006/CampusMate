import re
from typing import List, Dict, Any, Tuple
import pandas as pd
from rapidfuzz import fuzz

def normalize_for_comparison(text: str) -> str:
    """Lowercases, strips punctuation, and standardizes spacing."""
    t = text.lower().strip()
    t = re.sub(r'[^\w\s]', ' ', t, flags=re.UNICODE)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()

def check_dataset_leakage(
    new_samples: List[Dict[str, Any]],
    test_df: pd.DataFrame,
    val_df: pd.DataFrame = None,
    similarity_threshold: float = 88.0
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Detects potential test/val set leakage using exact normalized matches and RapidFuzz token set ratio.
    Returns:
        (clean_samples, leaked_samples)
    """
    test_texts = [normalize_for_comparison(str(t)) for t in test_df['text']]
    val_texts = [normalize_for_comparison(str(t)) for t in val_df['text']] if val_df is not None else []
    
    held_out_texts = set(test_texts + val_texts)
    
    clean_samples = []
    leaked_samples = []
    
    for item in new_samples:
        query = str(item.get('query') or item.get('text', ''))
        norm_query = normalize_for_comparison(query)
        
        # 1. Exact normalized match check
        if norm_query in held_out_texts:
            leaked_samples.append({**item, 'leakage_reason': 'exact_match_with_held_out'})
            continue
            
        # 2. Fuzzy similarity check against all test/val samples
        is_leaked = False
        for held_out in held_out_texts:
            sim = fuzz.token_set_ratio(norm_query, held_out)
            if sim >= similarity_threshold:
                leaked_samples.append({
                    **item,
                    'leakage_reason': f'fuzzy_similarity_{sim:.1f}_pct',
                    'matched_sample': held_out
                })
                is_leaked = True
                break
                
        if not is_leaked:
            clean_samples.append(item)
            
    return clean_samples, leaked_samples

