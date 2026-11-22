import os
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from rank_bm25 import BM25Okapi
import numpy as np

from app.nlp.preprocessing import normalize_unicode, tokenize, remove_stopwords
from app.retrieval.dense_retriever import DenseRetriever

logger = logging.getLogger("nlp_service.f19_knowledge.index")

class KnowledgeFactIndex:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.getenv("DATA_DIR", "data")
        self.index_file = os.path.join(self.data_dir, "index", "knowledge_facts.json")
        self.facts: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self.tokenized_corpus: List[List[str]] = []
        self.dense_retriever = DenseRetriever()
        self.load_index()

    def build_index(self, approved_facts: List[Dict[str, Any]]):
        """Index approved facts with BM25 and Dense embeddings."""
        self.facts = approved_facts
        self.tokenized_corpus = []
        
        texts_to_embed = []
        for fact in self.facts:
            # Aggregate title, question variants, and answer
            searchable_text = f"{fact.get('title', '')} {' '.join(fact.get('question_variants', []))} {fact.get('answer', '')}"
            norm = normalize_unicode(searchable_text).lower()
            tokens = remove_stopwords(tokenize(norm))
            self.tokenized_corpus.append(tokens)
            texts_to_embed.append(searchable_text)
            
        if self.tokenized_corpus:
            self.bm25 = BM25Okapi(self.tokenized_corpus)
        else:
            self.bm25 = None
            
        # Save facts locally
        os.makedirs(os.path.dirname(self.index_file), exist_ok=True)
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(self.facts, f, ensure_ascii=False, indent=2)
            
        logger.info(f"Built KnowledgeFactIndex with {len(self.facts)} approved facts")

    def load_index(self):
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, "r", encoding="utf-8") as f:
                    self.facts = json.load(f)
                self.tokenized_corpus = []
                for fact in self.facts:
                    searchable_text = f"{fact.get('title', '')} {' '.join(fact.get('question_variants', []))} {fact.get('answer', '')}"
                    norm = normalize_unicode(searchable_text).lower()
                    tokens = remove_stopwords(tokenize(norm))
                    self.tokenized_corpus.append(tokens)
                if self.tokenized_corpus:
                    self.bm25 = BM25Okapi(self.tokenized_corpus)
                logger.info(f"Loaded {len(self.facts)} facts into KnowledgeFactIndex")
            except Exception as e:
                logger.warning(f"Failed to load facts index: {e}")
                self.facts = []
                self.bm25 = None

    def search_facts(
        self,
        query: str,
        entities: Optional[Dict[str, Any]] = None,
        top_k: int = 5
    ) -> List[Tuple[Dict[str, Any], float]]:
        """Search approved facts using BM25 and entity matching."""
        if not self.facts or not self.bm25:
            return []
            
        norm_q = normalize_unicode(query).lower()
        q_tokens = remove_stopwords(tokenize(norm_q))
        if not q_tokens:
            return []
        scores = self.bm25.get_scores(q_tokens)
        
        results = []
        for idx, score in enumerate(scores):
            fact = self.facts[idx]
            final_score = float(score)
            
            # Boost / filter by entities (semester, branch, course)
            if entities:
                req_sem = entities.get("semester")
                req_branch = entities.get("branch")
                req_course = entities.get("course")
                
                fact_tags = fact.get("tags", {})
                if req_course and fact_tags.get("course"):
                    if req_course.upper() == str(fact_tags.get("course")).upper():
                        final_score += 10.0
                    else:
                        final_score -= 5.0
                        
                if req_branch and fact_tags.get("branch"):
                    if req_branch.upper() in str(fact_tags.get("branch")).upper():
                        final_score += 5.0
                        
                if req_sem and fact_tags.get("semester"):
                    if str(req_sem).lower() in str(fact_tags.get("semester")).lower():
                        final_score += 5.0
                        
            if final_score > 0:
                results.append((fact, final_score))
                
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

# Global singleton instance
facts_index = KnowledgeFactIndex()
