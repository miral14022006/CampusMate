import json
import logging
import math
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from enum import Enum

from features.f05_clarification.slots_config import (
    INTENT_REQUIRED_SLOTS,
    INTENT_DEPARTMENT_ROUTING,
)

logger = logging.getLogger(__name__)

class DecisionOutcome(str, Enum):
    ANSWER = "ANSWER"
    CLARIFY = "CLARIFY"
    FALLBACK = "FALLBACK"

def is_general_concept_query(query: str) -> bool:
    if not query:
        return False
    q_low = re.sub(r"[^\w\s]", " ", query.lower())
    q_low = re.sub(r"\s+", " ", q_low).strip()

    # Campus/college specific indicator terms
    campus_indicators = [
        "fee", "fees", "hostel", "mess", "timetable", "time table", "exam", "exams",
        "examination", "circular", "semester", "sem", "pdeu", "pdpu", "hall ticket",
        "admit card", "holiday", "holidays", "academic calendar", "registration",
        "result", "results", "spi", "cpi", "cgpa", "course code", "warden",
        "club", "president", "professor", "hod", "department", "campus", "college",
        "swimming", "pool", "library", "canteen", "sports",
        "फीस", "होस्टल", "हॉस्टल", "परीक्षा", "समय सारिणी", "तारीख", "कैलेंडर", "अवकाश",
        "સ્વિમિંગ", "પુલ", "ફી", "હોસ્ટેલ", "પરીક્ષા", "સમયપત્રક", "તારીખ", "કેલેન્ડર", "રજા"
    ]
    if any(re.search(r"\b" + re.escape(ci) + r"\b", q_low) for ci in campus_indicators):
        return False

    # Common greetings and conversational pleasantries
    conversational_triggers = [
        "hi", "hello", "hey", "hola", "namaste", "kem cho", "how are you", "who are you",
        "what can you do", "good morning", "good evening", "good afternoon", "thank you",
        "thanks", "bye", "goodbye", "help", "who created you", "what is your name"
    ]
    if any(re.search(r"\b" + re.escape(ct) + r"\b", q_low) for ct in conversational_triggers):
        return True

    keywords = [
        "object oriented", "oop", "rest api", "restful", "tcp", "udp",
        "machine learning", "deep learning", "neural network", "recursion",
        "binary search", "data structure", "algorithm", "sorting", "merge sort",
        "quick sort", "database", "sql", "nosql", "docker", "kubernetes",
        "operating system", "deadlock", "semaphore", "compiler", "microservice",
        "git", "github", "http", "https", "python", "javascript", "react", "html", "css",
        "moon", "earth", "sun", "space", "science", "history", "geography", "who is", "who was",
        "tell me about", "what is", "why is", "how to", "capital of", "president", "prime minister"
    ]
    has_kw = any(re.search(r"\b" + re.escape(kw) + r"\b", q_low) for kw in keywords)
    if has_kw:
        return True

    prompt_triggers = [
        "what is", "explain", "define", "difference between", "how does", "compare", "give example", "what are",
        "who was", "who is", "where is", "when was", "can you", "tell me"
    ]
    has_trigger = any(re.search(r"\b" + re.escape(tr) + r"\b", q_low) for tr in prompt_triggers)
    if has_trigger:
        return True

    return len(q_low.split()) <= 4

class DecisionPolicy:
    def __init__(
        self,
        t_high: float = 0.65,
        t_low: float = 0.35,
        margin_threshold: float = 0.15,
        min_retrieval_score: float = 0.01,
        contacts_file: Optional[Path] = None,
        templates_file: Optional[Path] = None
    ):
        self.t_high = t_high
        self.t_low = t_low
        self.margin_threshold = margin_threshold
        self.min_retrieval_score = min_retrieval_score

        curr = Path(__file__).resolve().parent
        base_dir = None
        for _ in range(5):
            if (curr / "data" / "contacts.json").exists():
                base_dir = curr
                break
            curr = curr.parent
        if not base_dir:
            base_dir = Path.cwd()

        self.contacts_path = contacts_file or (base_dir / "data" / "contacts.json")
        self.templates_path = templates_file or (base_dir / "data" / "templates" / "clarification_templates.json")

        self.contacts = self._load_json(self.contacts_path)
        self.templates = self._load_json(self.templates_path)

    def _load_json(self, path: Path) -> Dict[str, Any]:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading {path}: {e}")
        return {}

    def get_contact_info(self, intent: str, lang: str = "en") -> Dict[str, Any]:
        dept_key = INTENT_DEPARTMENT_ROUTING.get(intent, "general_helpdesk")
        info = self.contacts.get(dept_key, self.contacts.get("general_helpdesk", {}))
        name = info.get(f"name_{lang}", info.get("name", "College Helpdesk"))
        return {
            "department": dept_key,
            "name": name,
            "email": info.get("email", "helpdesk@college.edu.in"),
            "phone": info.get("phone", "+91-79-2395-2000"),
            "room": info.get("room", "Admin Building"),
            "hours": info.get("hours", "9:00 AM - 5:00 PM")
        }

    def evaluate(
        self,
        top_intents: List[Dict[str, Any]],
        entities: List[Dict[str, Any]],
        retrieved_chunks: Optional[List[Dict[str, Any]]] = None,
        language: str = "en",
        raw_query: str = ""
    ) -> Dict[str, Any]:
        if raw_query and is_general_concept_query(raw_query):
            return {
                "decision": DecisionOutcome.ANSWER.value,
                "reason": "General technical/educational query routed to LLM knowledge",
                "decision_reason": "GENERAL_KNOWLEDGE",
                "clarification_question": None,
                "quick_replies": [],
                "contact_info": None
            }

        lang = language if language in ["hi", "gu", "hi-Latn"] else "en"

        best_retrieval_score = 0.0
        best_rerank_normalized = 0.0
        has_retrieval_evidence = False
        if retrieved_chunks:
            best_retrieval_score = max([c.get("score", 0.0) for c in retrieved_chunks], default=0.0)
            rerank_scores = [c.get("rerank_score") for c in retrieved_chunks if c.get("rerank_score") is not None]
            if rerank_scores:
                best_rerank = max(rerank_scores)
                best_rerank_normalized = 1.0 / (1.0 + math.exp(-float(best_rerank)))
            if best_retrieval_score >= 0.014 or best_rerank_normalized >= 0.004:
                has_retrieval_evidence = True

        top1 = top_intents[0] if top_intents else {"intent": "out_of_scope", "confidence": 0.0}
        top1_intent = top1.get("intent", "out_of_scope")
        top1_conf = float(top1.get("confidence", 0.0))

        if has_retrieval_evidence:
            return {
                "decision": DecisionOutcome.ANSWER.value,
                "reason": f"Sufficient retrieval evidence present (score: {best_retrieval_score:.4f})",
                "decision_reason": "ANSWERED",
                "clarification_question": None,
                "quick_replies": [],
                "contact_info": None
            }

        if top1_intent != "out_of_scope":
            missing_slot = self._check_missing_slot(top1_intent, entities)
            if missing_slot:
                return self._build_slot_clarification(
                    top1_intent, missing_slot, f"Missing required slot: {missing_slot}", lang
                )

        if top1_conf >= self.t_high:
            return {
                "decision": DecisionOutcome.ANSWER.value,
                "reason": f"High intent confidence ({top1_conf:.2f} >= {self.t_high})",
                "decision_reason": "ANSWERED",
                "clarification_question": None,
                "quick_replies": [],
                "contact_info": None
            }

        if len(top_intents) >= 2:
            top2 = top_intents[1]
            diff = top1_conf - float(top2.get("confidence", 0.0))
            if top1_conf >= self.t_low and diff < self.margin_threshold:
                return self._build_intent_clarification(
                    [top1, top2], f"Close margin ({diff:.2f} < {self.margin_threshold}) between top intents", lang
                )

        if top1_conf >= self.t_low:
            return {
                "decision": DecisionOutcome.ANSWER.value,
                "reason": f"Moderate confidence ({top1_conf:.2f} >= {self.t_low})",
                "decision_reason": "ANSWERED",
                "clarification_question": None,
                "quick_replies": [],
                "contact_info": None
            }

        return self._build_fallback(
            f"Low confidence ({top1_conf:.2f} < {self.t_low}) with insufficient retrieval evidence",
            top1_intent,
            lang
        )

    def _check_missing_slot(self, intent: str, entities: List[Dict[str, Any]]) -> Optional[str]:
        required = INTENT_REQUIRED_SLOTS.get(intent, [])
        extracted_labels = {e.get("label", "").upper() for e in entities}
        for req in required:
            if req.upper() not in extracted_labels:
                return req.lower()
        return None

    def _build_intent_clarification(
        self,
        candidates: List[Dict[str, Any]],
        reason: str,
        lang: str,
        decision_reason: str = "LOW_INTENT"
    ) -> Dict[str, Any]:
        prompt = self.templates.get("intent_clarification_prompts", {}).get(
            lang, "Did you mean:"
        )
        labels_map = self.templates.get("intent_labels", {}).get(lang, {})
        en_labels = self.templates.get("intent_labels", {}).get("en", {})

        quick_replies = []
        for cand in candidates:
            cand_intent = cand.get("intent")
            label = labels_map.get(cand_intent, en_labels.get(cand_intent, cand_intent.replace("_", " ").title()))
            quick_replies.append({
                "label": label,
                "payload": cand_intent,
                "confidence": round(cand.get("confidence", 0.0), 3)
            })

        question = f"{prompt}\n" + "\n".join([f"• {qr['label']}" for qr in quick_replies])

        return {
            "decision": DecisionOutcome.CLARIFY.value,
            "reason": reason,
            "decision_reason": decision_reason,
            "clarification_question": question,
            "quick_replies": quick_replies,
            "contact_info": None
        }

    def _build_slot_clarification(
        self,
        intent: str,
        missing_slot: str,
        reason: str,
        lang: str,
        decision_reason: str = "CLARIFY_SLOT"
    ) -> Dict[str, Any]:
        slot_questions = self.templates.get("missing_slot_questions", {}).get(missing_slot, {})
        question = slot_questions.get(lang, slot_questions.get("en", f"Could you please specify the {missing_slot}?"))

        quick_replies = []
        if missing_slot == "semester":
            for sem in ["Sem 1", "Sem 3", "Sem 5", "Sem 7"]:
                quick_replies.append({"label": sem, "payload": f"{intent} {sem}", "confidence": 1.0})
        elif missing_slot == "course_name":
            for c in ["B.Tech CS", "B.Tech Mech", "MCA", "MBA"]:
                quick_replies.append({"label": c, "payload": f"{intent} {c}", "confidence": 1.0})
        elif missing_slot == "category":
            for cat in ["Boys Hostel", "Girls Hostel"]:
                quick_replies.append({"label": cat, "payload": f"{intent} {cat}", "confidence": 1.0})

        return {
            "decision": DecisionOutcome.CLARIFY.value,
            "reason": reason,
            "decision_reason": decision_reason,
            "clarification_question": question,
            "quick_replies": quick_replies,
            "contact_info": None
        }

    def _build_fallback(
        self,
        reason: str,
        intent: str,
        lang: str,
        decision_reason: str = "LOW_EVIDENCE"
    ) -> Dict[str, Any]:
        msg = self.templates.get("fallback_messages", {}).get(
            lang, "I'm not sure how to answer that. Please contact our college office:"
        )
        contact = self.get_contact_info(intent, lang=lang)
        
        if os.getenv("CAMPUS_CONTACTS_VERIFIED", "false").lower() == "true":
            lines = [msg, "", f"🏛️ **{contact['name']}**"]
            for icon, key in (("📍", "room"), ("📞", "phone"), ("✉️", "email"), ("⏰", "hours")):
                if contact.get(key):
                    label = "Hours" if key == "hours" else ""
                    lines.append(f"{icon} {label + ': ' if label else ''}{contact[key]}")
            fallback_text = "\n".join(lines)
            contact_payload = contact
        else:
            fallback_text = "I could not find relevant information in the uploaded campus documents. Please check with your college office or academic coordinator."
            contact_payload = None

        return {
            "decision": DecisionOutcome.FALLBACK.value,
            "reason": reason,
            "decision_reason": decision_reason,
            "clarification_question": fallback_text,
            "quick_replies": [
                {"label": "General Helpdesk", "payload": "general_queries", "confidence": 1.0},
                {"label": "Contact Admin", "payload": "faculty_contacts", "confidence": 1.0}
            ],
            "contact_info": contact_payload
        }

decision_policy = DecisionPolicy()
