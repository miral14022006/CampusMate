import json
import logging
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
        retrieved_chunks: List[Dict[str, Any]],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Evaluate context against thresholds and slots.
        
        Parameters:
        - top_intents: List of dicts with keys 'intent' and 'confidence' sorted descending.
        - entities: List of extracted entities with 'label' and 'text'.
        - retrieved_chunks: List of retrieved chunks with 'score'.
        - language: Detected language ('en', 'hi', 'gu', 'hi-Latn').
        
        Returns:
        - dict with 'decision', 'reason', 'clarification_question', 'quick_replies', 'contact_info'.
        """
        lang = language if language in ["hi", "gu", "hi-Latn"] else "en"

        if not top_intents:
            return self._build_fallback(
                reason="No intent predictions available",
                intent="out_of_scope",
                lang=lang
            )

        top1 = top_intents[0]
        top1_intent = top1.get("intent", "out_of_scope")
        top1_conf = float(top1.get("confidence", 0.0))

        top2_intent = top_intents[1].get("intent") if len(top_intents) > 1 else None
        top2_conf = float(top_intents[1].get("confidence", 0.0)) if len(top_intents) > 1 else 0.0

        margin = top1_conf - top2_conf

        # 1. Check out_of_scope or below lower bound
        if top1_intent == "out_of_scope" or top1_conf < self.t_low:
            return self._build_fallback(
                reason=f"Confidence {top1_conf:.3f} is below lower threshold {self.t_low} or out of scope",
                intent=top1_intent,
                lang=lang
            )

        # 2. Check ambiguity: close margin between top-1 and top-2
        if top2_intent and top2_intent != "out_of_scope" and (margin < self.margin_threshold) and (top1_conf < 0.85):
            return self._build_intent_clarification(
                candidates=[top1, top_intents[1]],
                reason=f"Ambiguous intent: top-1 '{top1_intent}' ({top1_conf:.2f}) and top-2 '{top2_intent}' ({top2_conf:.2f}) margin is {margin:.2f} < {self.margin_threshold}",
                lang=lang
            )

        # 3. Check intermediate confidence (between T_low and T_high)
        if top1_conf < self.t_high:
            candidates = [top1]
            if top2_intent and top2_intent != "out_of_scope":
                candidates.append(top_intents[1])
            return self._build_intent_clarification(
                candidates=candidates,
                reason=f"Confidence {top1_conf:.3f} is between {self.t_low} and {self.t_high}",
                lang=lang
            )

        # 4. Check missing required entity slot
        missing_slot = self._check_missing_slot(top1_intent, entities)
        if missing_slot:
            return self._build_slot_clarification(
                intent=top1_intent,
                missing_slot=missing_slot,
                reason=f"Intent '{top1_intent}' requires missing entity slot '{missing_slot}'",
                lang=lang
            )

        # 5. Check retrieval confidence if retrieval was performed
        if retrieved_chunks:
            best_retrieval_score = max([c.get("score", 0.0) for c in retrieved_chunks], default=0.0)
            if best_retrieval_score < self.min_retrieval_score and top1_conf < 0.80:
                return self._build_fallback(
                    reason=f"Retrieval score {best_retrieval_score:.3f} is below minimum {self.min_retrieval_score}",
                    intent=top1_intent,
                    lang=lang
                )

        # Passed all checks -> Proceed to ANSWER
        return {
            "decision": DecisionOutcome.ANSWER.value,
            "reason": f"High confidence ({top1_conf:.3f} >= {self.t_high}) and entity requirements met",
            "clarification_question": None,
            "quick_replies": [],
            "contact_info": None
        }

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
        lang: str
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
            "clarification_question": question,
            "quick_replies": quick_replies,
            "contact_info": None
        }

    def _build_slot_clarification(
        self,
        intent: str,
        missing_slot: str,
        reason: str,
        lang: str
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
            "clarification_question": question,
            "quick_replies": quick_replies,
            "contact_info": None
        }

    def _build_fallback(
        self,
        reason: str,
        intent: str,
        lang: str
    ) -> Dict[str, Any]:
        msg = self.templates.get("fallback_messages", {}).get(
            lang, "I'm not sure how to answer that. Please contact our college office:"
        )
        contact = self.get_contact_info(intent, lang=lang)
        lines = [msg, "", f"🏛️ **{contact['name']}**"]
        # Contact details are only spoken when the deployment owner has marked
        # them verified; otherwise the reply names the responsible office and
        # asks the student to use the official channels.
        if os.getenv("CAMPUS_CONTACTS_VERIFIED", "false").lower() == "true":
            for icon, key in (("📍", "room"), ("📞", "phone"), ("✉️", "email"), ("⏰", "hours")):
                if contact.get(key):
                    label = "Hours" if key == "hours" else ""
                    lines.append(f"{icon} {label + ': ' if label else ''}{contact[key]}")
        else:
            lines.append("Verified contact details have not been configured for this deployment yet.")
        fallback_text = "\n".join(lines)

        return {
            "decision": DecisionOutcome.FALLBACK.value,
            "reason": reason,
            "clarification_question": fallback_text,
            "quick_replies": [
                {"label": "General Helpdesk", "payload": "general_queries", "confidence": 1.0},
                {"label": "Contact Admin", "payload": "faculty_contacts", "confidence": 1.0}
            ],
            "contact_info": contact
        }

# Singleton default instance
decision_policy = DecisionPolicy()
