import os
import time
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.nlp.preprocessing import clean_text, normalize_slang
from app.nlp.language_detection import detect_language
from app.nlp.transliteration import transliterate_to_dual_form
from app.nlp.intent_classifier import intent_classifier
from app.nlp.entity_extraction import extract_entities
from app.retrieval.hybrid_retriever import hybrid_retriever
from app.rag.rag_engine import rag_engine

class ConversationSessionManager:
    """Lightweight session-isolated dialogue state tracker with slot carry-over."""
    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def get_state(self, session_id: str) -> Dict[str, Any]:
        if session_id not in self._sessions:
            self._sessions[session_id] = {
                "session_id": session_id,
                "slots": {},
                "last_intent": None,
                "turn_count": 0
            }
        return self._sessions[session_id]

    def update_state(self, session_id: str, new_slots: Dict[str, Any], intent: str):
        state = self.get_state(session_id)
        state["turn_count"] += 1
        state["last_intent"] = intent
        for k, v in new_slots.items():
            if v is not None:
                state["slots"][k] = v

session_manager = ConversationSessionManager()

def process_query(
    query: str,
    session_id: Optional[str] = None,
    preferred_mode: str = "rag"
) -> Dict[str, Any]:
    """
    Main orchestrator executing the full student question processing flow.
    """
    start_time = time.time()
    clean_q = clean_text(query)
    norm_q = normalize_slang(clean_q)

    # 1. Language & Script Detection
    lang_info = detect_language(clean_q)
    detected_lang = lang_info["language"]

    # 2. Transliteration (Dual-form query expansion)
    _, dual_form_q = transliterate_to_dual_form(norm_q, detected_lang)

    # 3. Intent Classification
    intent_info = intent_classifier.classify(dual_form_q)
    intent = intent_info["intent"]
    confidence = intent_info["confidence"]

    # 4. Entity Extraction
    entities_info = extract_entities(clean_q)

    # 5. Conversation Memory & Slot Carry-Over
    active_slots = {}
    if session_id:
        prev_state = session_manager.get_state(session_id)
        # Inherit non-overridden slots (e.g. branch, semester)
        active_slots = dict(prev_state.get("slots", {}))

    # Update with newly extracted entities
    for k in ["branch", "semester", "course", "exam_type", "academic_year"]:
        if entities_info.get(k):
            active_slots[k] = entities_info[k]

    if session_id:
        session_manager.update_state(session_id, active_slots, intent)

    # Contextual query reformulation for retrieval if follow-up
    search_q = dual_form_q
    if active_slots.get("branch") and not any(b in search_q.lower() for b in ["cse", "ict", "mechanical", "chemical", "civil"]):
        search_q = f"{search_q} {active_slots['branch']}"
    if active_slots.get("semester"):
        search_q = f"{search_q} semester {active_slots['semester']}"

    # Feature 19 Knowledge Base lookup (if enabled / facts present)
    feature_knowledge = os.getenv("FEATURE_KNOWLEDGE", "true").lower() == "true"
    from features.f19_knowledge.answering import knowledge_answer_engine
    from features.f19_knowledge.index import facts_index
    
    if feature_knowledge and facts_index.facts:
        kb_res = knowledge_answer_engine.answer_query(clean_q)
        if kb_res.get("matched") and kb_res.get("mode") in ["fact", "clarify"]:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "session_id": session_id,
                "detected_language": kb_res.get("detected_language", detected_lang),
                "intent": "knowledge_fact",
                "confidence": kb_res.get("confidence", 0.95),
                "entities": entities_info.get("entities", {}),
                "slots": active_slots,
                "decision": "ANSWER" if kb_res.get("mode") == "fact" else "CLARIFY",
                "decision_reason": kb_res.get("decision_reason"),
                "answer": kb_res.get("answer"),
                "citations": kb_res.get("citations", []),
                "quick_replies": kb_res.get("quick_replies", []),
                "mode": kb_res.get("mode"),
                "fact_id": kb_res.get("fact_id"),
                "latency_ms": elapsed_ms
            }

    # 6. Hybrid Retrieval
    retrieved_chunks = hybrid_retriever.search(
        query=norm_q,
        top_k=settings.TOP_K,
        method="hybrid" if preferred_mode == "rag" else "tfidf",
        dual_form_query=search_q
    )

    # 7. Evidence Validation & Clarification
    clarification_q = None
    if confidence < 0.25 and not retrieved_chunks:
        decision = "FALLBACK"
        decision_reason = "OUT_OF_SCOPE"
    elif 0.25 <= confidence < settings.CONFIDENCE_THRESHOLD and not active_slots.get("branch"):
        decision = "CLARIFY"
        decision_reason = "AMBIGUOUS_BRANCH"
        clarification_q = "Could you please specify which engineering branch or semester this is for?"
    else:
        decision = "ANSWER"
        decision_reason = "GROUNDED_EVIDENCE"

    # 8. Answer Generation (RAG or Extractive)
    rag_result = rag_engine.generate_answer(
        query=clean_q,
        retrieved_chunks=retrieved_chunks,
        detected_language=detected_lang
    )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return {
        "answer": rag_result["answer"],
        "reply": rag_result["answer"],
        "language": detected_lang,
        "intent": intent,
        "confidence": confidence,
        "source_doc": rag_result.get("source_doc"),
        "entities": [{"type": k, "value": v} for k, v in active_slots.items()],
        "citations": rag_result.get("citations", []),
        "calendar_events": [],
        "grounded": rag_result.get("grounded", True),
        "generation_mode": rag_result.get("mode", "rag"),
        "hallucination_score": 0.0,
        "decision": decision,
        "decision_reason": decision_reason,
        "clarification_question": clarification_q,
        "quick_replies": [],
        "dialogue_state": {"slots": active_slots, "session_id": session_id},
        "execution_time_ms": elapsed_ms
    }
