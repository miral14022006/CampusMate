from typing import List, Dict, Any

def reciprocal_rank_fusion(
    ranked_lists: List[List[Dict[str, Any]]],
    weights: List[float] = None,
    k: int = 60
) -> List[Dict[str, Any]]:
    """
    Combines multiple ranked candidate lists using Reciprocal Rank Fusion (RRF).
    Formula: RRF_score(d) = sum_{m in models} w_m / (k + rank_m(d))
    """
    if not ranked_lists:
        return []

    if weights is None:
        weights = [1.0] * len(ranked_lists)

    scores: Dict[str, float] = {}
    chunk_store: Dict[str, Dict[str, Any]] = {}

    for list_idx, candidate_list in enumerate(ranked_lists):
        w = weights[list_idx]
        for rank, item in enumerate(candidate_list, start=1):
            chunk_id = item["chunk_id"]
            if chunk_id not in chunk_store:
                chunk_store[chunk_id] = item

            # RRF formula
            rrf_contribution = w / (k + rank)
            scores[chunk_id] = scores.get(chunk_id, 0.0) + rrf_contribution

    # Sort candidates by combined RRF score descending
    sorted_chunk_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)

    fused_results = []
    for cid in sorted_chunk_ids:
        item = dict(chunk_store[cid])
        item["score"] = round(scores[cid], 6)
        fused_results.append(item)

    return fused_results

