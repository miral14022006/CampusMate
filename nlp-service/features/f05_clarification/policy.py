import json
import logging
import math
import os
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

class DecisionPolicy:
    """
    Confidence-based decision policy evaluating intent classification,
    top candidate margins, missing entity slots, and retrieval scores.
    """
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

        # Search for data directory upwards
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
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Evaluate context against thresholds and slots.
        Retrieval evidence is PRIMARY: if relevant chunks exist with sufficient score,
        the policy decides ANSWER (or CLARIFY if a crucial required slot like semester is missing),
        regardless of whether intent classification returned out_of_scope.
        """
        lang = language if language in ["hi", "gu", "hi-Latn"] else "en"

        # Check retrieval evidence strength first. Use both the raw RRF score and
        # the cross-encoder logit (normalized to 0..1) so reranked evidence is not
        # discarded when the raw RRF value happens to be low.
        best_retrieval_score = 0.0
        best_rerank_normalized = 0.0
        has_retrieval_evidence = False
        if retrieved_chunks:
            best_retrieval_score = max([c.get("score", 0.0) for c in retrieved_chunks], default=0.0)
            rerank_scores = [c.get("rerank_score") for c in retrieved_chunks if c.get("rerank_score") is not None]
            if rerank_scores:
                best_rerank = max(rerank_scores)
                best_rerank_normalized = 1.0 / (1.0 + math.exp(-float(best_rerank)))
            # RRF score >= 0.028 or normalized reranker score >= 0.50
            if best_retrieval_score >= 0.028 or best_rerank_normalized >= 0.50:
                has_retrieval_evidence = True

        top1 = top_intents[0] if top_intents else {"intent": "out_of_scope", "confidence": 0.0}
        top1_intent = top1.get("intent", "out_of_scope")
        top1_conf = float(top1.get("confidence", 0.0))

        # Check missing required entity slot if an intent was identified
        if top1_intent != "out_of_scope":
            missing_slot = self._check_missing_slot(top1_intent, entities)
            if missing_slot:
                return self._build_slot_clarification(
                    intent=top1_intent,
                    missing_slot=missing_slot,
                    reason=f"Intent '{top1_intent}' requires missing entity slot '{missing_slot}'",
                    lang=lang,
                    decision_reason="CLARIFY_SLOT"
                )

        # If retrieval found strong evidence in the uploaded documents, proceed to ANSWER!
        if has_retrieval_evidence:
            return {
                "decision": DecisionOutcome.ANSWER.value,
                "reason": (
                    f"Sufficient retrieval evidence found (rrf={best_retrieval_score:.4f}, "
                    f"rerank_norm={best_rerank_normalized:.4f})"
                ),
                "decision_reason": "ANSWERED",
                "clarification_question": None,
                "quick_replies": [],
                "contact_info": None
            }

        # If retrieval evidence is insufficient or empty:
        if not retrieved_chunks:
            decision_reason = "NO_CHUNKS"
        elif best_retrieval_score < 0.028:
            decision_reason = "LOW_EVIDENCE"
        else:
            decision_reason = "FALLBACK"

        # Check if intent is high confidence despite lack of document chunks
        if top1_intent != "out_of_scope" and top1_conf >= self.t_high:
            return self._build_fallback(
                reason=f"High intent '{top1_intent}' ({top1_conf:.3f}) but insufficient document evidence ({best_retrieval_score:.4f})",
                intent=top1_intent,
                lang=lang,
                decision_reason=decision_reason
            )

        # Check ambiguity between intents
        top2_intent = top_intents[1].get("intent") if len(top_intents) > 1 else None
        top2_conf = float(top_intents[1].get("confidence", 0.0)) if len(top_intents) > 1 else 0.0
        margin = top1_conf - top2_conf

        if top2_intent and top2_intent != "out_of_scope" and (margin < self.margin_threshold) and (top1_conf < 0.85):
            return self._build_intent_clarification(
                candidates=[top1, top_intents[1]],
                reason=f"Ambiguous intent: top-1 '{top1_intent}' ({top1_conf:.2f}) and top-2 '{top2_intent}' ({top2_conf:.2f}) margin is {margin:.2f} < {self.margin_threshold}",
                lang=lang,
                decision_reason="LOW_INTENT"
            )

        if self.t_low <= top1_conf < self.t_high:
            candidates = [top1]
            if top2_intent and top2_intent != "out_of_scope":
                candidates.append(top_intents[1])
            return self._build_intent_clarification(
                candidates=candidates,
                reason=f"Confidence {top1_conf:.3f} is between {self.t_low} and {self.t_high}",
                lang=lang,
                decision_reason="LOW_INTENT"
            )

        out_reason = "OUT_OF_SCOPE" if top1_intent == "out_of_scope" else decision_reason
        return self._build_fallback(
            reason=f"Confidence {top1_conf:.3f} is below lower threshold {self.t_low} or out of scope",
            intent=top1_intent,
            lang=lang,
            decision_reason=out_reason
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

        # Generate sample quick replies based on missing slot
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
        
        # When campus contacts are not verified, do not output raw markdown asterisks or placeholder text
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

# Singleton default instance
decision_policy = DecisionPolicy()
