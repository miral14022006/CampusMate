import os
import re
from typing import List, Dict, Any, Optional

from features.f01_hybrid_retrieval.base import BaseRetriever
from features.f01_hybrid_retrieval.bm25_retriever import bm25_retriever
from features.f01_hybrid_retrieval.dense_retriever import dense_retriever
from features.f01_hybrid_retrieval.rrf import reciprocal_rank_fusion
from features.f01_hybrid_retrieval.reranker import reranker
from app.modules.retrieval_tfidf import retriever as tfidf_retriever

SEMESTER_MAP = {
    "1": "I", "1st": "I", "first": "I", "i": "I",
    "2": "II", "2nd": "II", "second": "II", "ii": "II",
    "3": "III", "3rd": "III", "third": "III", "iii": "III",
    "4": "IV", "4th": "IV", "fourth": "IV", "iv": "IV",
    "5": "V", "5th": "V", "fifth": "V", "v": "V",
    "6": "VI", "6th": "VI", "sixth": "VI", "vi": "VI",
    "7": "VII", "7th": "VII", "seventh": "VII", "vii": "VII",
    "8": "VIII", "8th": "VIII", "eighth": "VIII", "viii": "VIII"
}

BRANCH_SYNONYMS = {
    "computer": ["computer", "cse", "computer science", "computer engineering", "ce", "cp"],
    "civil": ["civil", "civil engineering"],
    "mechanical": ["mechanical", "mechanical engineering", "mech"],
    "electrical": ["electrical", "electrical engineering", "ee"],
    "chemical": ["chemical", "chemical engineering", "ch"],
    "petroleum": ["petroleum", "petroleum engineering", "pe"],
    "biotechnology": ["biotechnology", "biotech", "bt"],
    "ict": ["ict", "information and communication technology"],
    "ece": ["ece", "electronics and communication"],
    "csbs": ["csbs", "computer science and business systems"],
    "data science": ["data science", "m.sc. in data science", "msc data science"],
    "physics": ["physics", "m.sc. in physics", "msc physics"],
    "chemistry": ["chemistry", "m.sc. in chemistry", "msc chemistry"],
    "mathematics": ["mathematics", "maths", "math"],
    "climate": ["climate"]
}

class HybridRetriever(BaseRetriever):
    def __init__(
        self,
        bm25_weight: float = 1.0,
        dense_weight: float = 1.0,
        rrf_k: int = 60,
        use_reranker: bool = True
    ):
        self.bm25_weight = float(os.getenv("RRF_BM25_WEIGHT", str(bm25_weight)))
        self.dense_weight = float(os.getenv("RRF_DENSE_WEIGHT", str(dense_weight)))
        self.rrf_k = int(os.getenv("RRF_K", str(rrf_k)))
        self.use_reranker = os.getenv("ENABLE_RERANKER", "true").lower() == "true" and use_reranker

    @property
    def name(self) -> str:
        return "hybrid_rrf_rerank" if self.use_reranker else "hybrid_rrf"

    def _extract_timetable_slots(self, query: str):
        q = query.lower()
        found_sem = None
        sem_match = re.search(r'\b(?:sem(?:ester)?|સેમેસ્ટર|સેમ|सेमेस्टर)\s*[-:]?\s*([1-8]|i{1,3}|iv|v|vi{1,3}|vii|viii)\b', q)
        if sem_match:
            raw_sem = sem_match.group(1).lower()
            found_sem = SEMESTER_MAP.get(raw_sem, raw_sem.upper())
        else:
            num_sem_match = re.search(r'\b([1-8])(?:st|nd|rd|th)?\s*(?:sem(?:ester)?|સેમેસ્ટર|સેમ|सेमेस्टर|sem)\b', q)
            if num_sem_match:
                found_sem = SEMESTER_MAP.get(num_sem_match.group(1), num_sem_match.group(1))

        found_branch = None
        for canonical, synonyms in BRANCH_SYNONYMS.items():
            if any(re.search(r'\b' + re.escape(syn) + r'\b', q) for syn in synonyms):
                found_branch = canonical
                break

        # Check date pattern: e.g. "26 November", "26.11", "26th Nov"
        found_date = None
        m_dt = re.search(r'\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(nov(?:ember)?|dec(?:ember)?)\b', q)
        if m_dt:
            d = int(m_dt.group(1))
            m = "11" if "nov" in m_dt.group(2) else "12"
            found_date = f"{d:02d}.{m}.2026"
        else:
            m_dt_dot = re.search(r'\b(\d{2}\.\d{2}\.2026|\d{2}\.\d{2})\b', q)
            if m_dt_dot:
                found_date = m_dt_dot.group(1)
                if len(found_date) == 5:
                    found_date += ".2026"

        is_tt = any(k in q for k in [
            "timetable", "time table", "schedule", "exam date", "exam dates", "datesheet", "date sheet", "endsem", "end sem", "exam", "exams",
            "પરીક્ષા", "સમયપત્રક", "તારીખ", "તારીખો", "વિષય", "વિષયો", "બધા વિષય", "બધી માહિતી",
            "pariksha", "samaypatrak", "badha subject", "badhi information", "all subject", "all subjects"
        ]) or bool(found_date and ("exam" in q or "date" in q or "timetable" in q))

        return is_tt, found_branch, found_sem, found_date

    def _find_exact_timetable_chunk(self, branch: Optional[str], semester: Optional[str], date_str: Optional[str] = None) -> List[Dict[str, Any]]:
        matched = []

        # If date is specified: gather structured chunks containing that exam date
        if date_str:
            for c in bm25_retriever.chunks:
                if not c.get("chunk_id", "").startswith("timetable_"):
                    continue
                c_text = c.get("text", "")
                if date_str in c_text:
                    c_copy = {
                        "chunk_id": c["chunk_id"],
                        "doc_name": c["doc_name"],
                        "page": c.get("page", 1),
                        "score": 0.99,
                        "rerank_score": 1.0,
                        "text": c["text"]
                    }
                    matched.append(c_copy)
            return matched

        # If semester is specified without branch (e.g. "all semester VII examination dates")
        if semester and not branch:
            for c in bm25_retriever.chunks:
                if not c.get("chunk_id", "").startswith("timetable_"):
                    continue
                bs = c.get("branch_sem", "").lower()
                if re.search(r'\b' + re.escape(semester.lower()) + r'\b', bs):
                    c_copy = {
                        "chunk_id": c["chunk_id"],
                        "doc_name": c["doc_name"],
                        "page": c.get("page", 1),
                        "score": 0.99,
                        "rerank_score": 1.0,
                        "text": c["text"]
                    }
                    matched.append(c_copy)
            return matched

        # Normal branch + semester matching
        if not branch and not semester:
            return []

        for c in bm25_retriever.chunks:
            if not c.get("chunk_id", "").startswith("timetable_"):
                continue
            bs = c.get("branch_sem", "").lower()
            sem_ok = True
            if semester:
                sem_ok = bool(re.search(r'\b' + re.escape(semester.lower()) + r'\b', bs))
            branch_ok = True
            if branch:
                synonyms = BRANCH_SYNONYMS.get(branch, [branch])
                branch_ok = any(re.search(r'\b' + re.escape(syn) + r'\b', bs) for syn in synonyms)
            if sem_ok and branch_ok:
                c_copy = {
                    "chunk_id": c["chunk_id"],
                    "doc_name": c["doc_name"],
                    "page": c.get("page", 1),
                    "score": 0.99,
                    "rerank_score": 1.0,
                    "text": c["text"]
                }
                matched.append(c_copy)
        return matched

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        # Check timetable specific exact match first
        is_tt, branch, semester, date_str = self._extract_timetable_slots(query)
        if is_tt and (branch or semester or date_str):
            tt_chunks = self._find_exact_timetable_chunk(branch, semester, date_str)
            if tt_chunks:
                other_hits = bm25_retriever.retrieve(query, top_k=top_k)
                existing_ids = {c.get("chunk_id") for c in tt_chunks}
                combined = tt_chunks + [h for h in other_hits if h.get("chunk_id") not in existing_ids]
                return combined[:max(top_k, len(tt_chunks) if len(tt_chunks) <= 5 else 5)]

        # Step 1: Retrieve top-20 candidates from BM25 and Dense
        bm25_hits = bm25_retriever.retrieve(query, top_k=20)
        dense_hits = dense_retriever.retrieve(query, top_k=20)

        # Step 2: Reciprocal Rank Fusion
        fused = reciprocal_rank_fusion(
            [bm25_hits, dense_hits],
            weights=[self.bm25_weight, self.dense_weight],
            k=self.rrf_k
        )

        # Step 3: Optional Cross-Encoder Reranking
        if self.use_reranker:
            return reranker.rerank(query, fused[:20], top_n=top_k)

        return fused[:top_k]

hybrid_retriever = HybridRetriever(use_reranker=False)
hybrid_rerank_retriever = HybridRetriever(use_reranker=True)

def get_retriever(retriever_type: str = "hybrid") -> BaseRetriever:
    t = retriever_type.lower()
    if t == "tfidf":
        return tfidf_retriever
    elif t == "bm25":
        return bm25_retriever
    elif t == "dense":
        return dense_retriever
    elif t == "hybrid":
        return hybrid_retriever
    elif t in ["hybrid_rerank", "hybrid+rerank"]:
        return hybrid_rerank_retriever
    else:
        return hybrid_retriever
