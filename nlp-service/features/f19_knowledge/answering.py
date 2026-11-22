from typing import List, Dict, Any, Optional, Tuple
import logging

from app.nlp.language_detection import detect_language
from app.nlp.transliteration import transliterate_to_dual_form
from app.nlp.entity_extraction import extract_entities
from features.f19_knowledge.index import facts_index

logger = logging.getLogger("nlp_service.f19_knowledge.answering")

LANGUAGE_WRAPPERS = {
    "en": {
        "date": "As per official records, the scheduled date is {val}.",
        "general": "According to {doc}: {ans}"
    },
    "hi": {
        "date": "आधिकारिक सूचना के अनुसार, निर्धारित तिथि {val} है।",
        "general": "{doc} के अनुसार: {ans}"
    },
    "gu": {
        "date": "સત્તાવાર પરિપત્ર મુજબ, નિયત તારીખ {val} છે.",
        "general": "{doc} મુજબ: {ans}"
    },
    "hinglish": {
        "date": "Official notice ke according scheduled date {val} hai.",
        "general": "{doc} ke according: {ans}"
    },
    "gujlish": {
        "date": "Official circular pramane scheduled date {val} chhe.",
        "general": "{doc} pramane: {ans}"
    }
}

class KnowledgeAnswerEngine:
    def __init__(self, score_threshold: float = 7.5, margin_threshold: float = 0.5):
        self.score_threshold = score_threshold
        self.margin_threshold = margin_threshold

    def answer_query(self, query: str) -> Dict[str, Any]:
        """
        Execute knowledge base answering pipeline:
        language detection -> transliteration -> entities -> fact lookup -> calibrated decision.
        """
        lang_res = detect_language(query)
        lang = lang_res.get("language", "en") if isinstance(lang_res, dict) else lang_res
        _, expanded_q = transliterate_to_dual_form(query, lang)
        entities = extract_entities(query)
        
        # Search facts using expanded query and entities
        matched_facts = facts_index.search_facts(expanded_q, entities=entities.get("entities"), top_k=5)
        
        if not matched_facts:
            return {
                "matched": False,
                "mode": "none",
                "decision_reason": "NO_MATCH",
                "answer": "I could not find this in the uploaded documents.",
                "fact_id": None,
                "citations": [],
                "confidence": 0.0,
                "detected_language": lang
            }
            
        top_fact, top_score = matched_facts[0]
        second_score = matched_facts[1][1] if len(matched_facts) > 1 else 0.0
        
        # Check clarification condition: multiple facts match similar score but missing key entity
        if len(matched_facts) > 1 and (top_score - second_score < 0.2) and not entities.get("semester"):
            sem_options = list({f.get("tags", {}).get("semester") for f, s in matched_facts if f.get("tags", {}).get("semester")})
            if len(sem_options) > 1:
                return {
                    "matched": True,
                    "mode": "clarify",
                    "decision_reason": "AMBIGUOUS_FACTS_NEED_SLOT",
                    "answer": f"Multiple schedules match your query. Please select your semester:",
                    "quick_replies": sem_options,
                    "fact_id": None,
                    "citations": [],
                    "confidence": top_score,
                    "detected_language": lang
                }
                
        # Check threshold
        if top_score >= self.score_threshold:
            # Fact Match Passed
            doc_name = top_fact.get("doc_name", "Official Circular")
            page = top_fact.get("page", 1)
            raw_ans = top_fact.get("answer", "")
            dates = top_fact.get("values", {}).get("dates", [])
            
            # Format response in user's detected language without changing numbers/dates
            wrapper = LANGUAGE_WRAPPERS.get(lang, LANGUAGE_WRAPPERS["en"])
            if dates and top_fact.get("type") in ["date_event", "schedule_row"]:
                direct_ans = wrapper["date"].format(val=", ".join(dates)) + f" ({raw_ans})"
            else:
                direct_ans = wrapper["general"].format(doc=doc_name, ans=raw_ans)
                
            citations = [{
                "citation_id": 1,
                "doc_name": doc_name,
                "page": page,
                "quote": top_fact.get("source_quote", ""),
                "url": f"/api/documents/preview/{top_fact.get('doc_id')}"
            }]
            
            return {
                "matched": True,
                "mode": "fact",
                "decision_reason": "FACT_RETRIEVAL_PASSED_THRESHOLD",
                "answer": direct_ans,
                "fact_id": top_fact.get("topic_key"),
                "citations": citations,
                "confidence": round(float(top_score), 2),
                "source_quote": top_fact.get("source_quote", ""),
                "detected_language": lang,
                "top_fact": top_fact
            }
            
        # Below threshold
        return {
            "matched": False,
            "mode": "none",
            "decision_reason": "BELOW_FACT_THRESHOLD",
            "answer": "I could not find this in the uploaded documents.",
            "fact_id": None,
            "citations": [],
            "confidence": round(float(top_score), 2),
            "detected_language": lang
        }

knowledge_answer_engine = KnowledgeAnswerEngine()
