import re
from typing import Dict, Any, List, Optional
from features.f06_dialogue_state.schemas import DialogueState, TurnRecord

RESET_TRIGGERS = {
    "reset", "new topic", "restart", "start over", "clear",
    "naya topic", "shuru se", "navo topic", "fareethi", "nava topic",
    "reset karo", "clear karo", "reset kar", "clear kar"
}

FOLLOW_UP_CONJUNCTIONS = {
    "and", "aur", "or", "ane", "also", "bhi", "pan", "ne",
    "what about", "kya", "su", "for", "ke liye", "mate"
}

INTENT_TEMPLATES = {
    "exam_timetable": "exam timetable schedule for {slots}",
    "exam_form_deadline": "exam form submission deadline for {slots}",
    "fee_payment": "fee payment schedule and fees for {slots}",
    "fee_structure": "tuition and college fee structure for {slots}",
    "fee_payment_dates": "fee payment schedule and fees for {slots}",
    "hostel": "hostel admission rules and accommodation for {slots}",
    "hostel_admission": "hostel admission accommodation details for {slots}",
    "hostel_rules": "hostel curfew and mess rules for {slots}",
    "syllabus": "syllabus structure and curriculum for {slots}",
    "syllabus_structure": "syllabus structure and curriculum for {slots}",
    "bus_transport": "bus pass route and transport for {slots}",
    "bus_pass_application": "bus pass route and transport for {slots}",
    "library_timings": "library working hours for {slots}",
    "library_hours": "library working hours for {slots}",
    "placement": "placement statistics for {slots}",
    "placement_stats": "placement statistics for {slots}",
    "admission": "admission eligibility cutoff for {slots}",
    "admission_cutoff": "admission eligibility cutoff for {slots}",
    "result": "semester examination results for {slots}",
    "re_evaluation": "re-evaluation re-checking process for {slots}",
    "re-evaluation": "re-evaluation re-checking process for {slots}",
    "attendance_rules": "minimum attendance criteria for {slots}"
}

class DialogueManager:
    """
    Stateless dialogue state manager:
    Receives current query + extracted entities + incoming DialogueState,
    detects reset triggers, detects follow-ups, performs slot carry-over & override,
    and produces a standalone rewritten query.
    """

    def is_reset_query(self, query: str) -> bool:
        norm = query.strip().lower()
        norm_clean = re.sub(r"[^\w\s]", "", norm)
        return norm_clean in RESET_TRIGGERS or norm in RESET_TRIGGERS

    def extract_slots_from_entities(self, entities: List[Dict[str, Any]], query: str = "") -> Dict[str, Any]:
        """Maps extracted entities and query regex patterns to standard dialogue state slots."""
        new_slots = {}
        for ent in entities:
            label = ent.get("label", "").upper()
            text = ent.get("text", "").strip()
            if label in ["SEMESTER", "SEM"]:
                new_slots["semester"] = text
            elif label in ["COURSE_NAME", "COURSE"]:
                new_slots["course"] = text
            elif label in ["BRANCH", "DEPARTMENT"]:
                new_slots["branch"] = text
                if "course" not in new_slots:
                    new_slots["course"] = text
            elif label in ["EXAM_TYPE", "EXAM"]:
                new_slots["exam_type"] = text
            elif label in ["DATE", "TIME"]:
                new_slots["date"] = text
            elif label in ["CATEGORY"]:
                new_slots["course"] = text # e.g. Boys Hostel / Girls Hostel

        # Augment with regex matchers for multilingual entities if missing
        if query:
            q_lower = query.lower()
            if "course" not in new_slots or not new_slots["course"]:
                for c in ["b.tech cs", "b.tech it", "b.tech cse", "b.tech", "mba", "mca", "civil", "mechanical", "electrical", "girls hostel", "boys hostel", "computer science", "computer engineering", "information technology"]:
                    if c in q_lower:
                        new_slots["course"] = c.title()
                        break
            if "semester" not in new_slots or not new_slots["semester"]:
                sem_match = re.search(r"(\d+(?:st|nd|rd|th)?\s*sem(?:ester)?)", q_lower)
                if sem_match:
                    new_slots["semester"] = sem_match.group(1)
            if "branch" not in new_slots or not new_slots["branch"]:
                for loc in ["gandhinagar", "ahmedabad", "vadodara", "anand", "surat"]:
                    if loc in q_lower:
                        new_slots["branch"] = loc.title()
                        break

        return new_slots

    def is_follow_up(
        self,
        query: str,
        state: DialogueState,
        extracted_slots: Dict[str, Any],
        intent_confidence: float
    ) -> bool:
        """
        Determines whether the incoming query is an elliptical or follow-up query:
        1. Query starts with a follow-up conjunction (and, aur, ane, what about, for).
        2. Query is short (< 6 words) and contains slot entities or fills an awaiting slot.
        3. Low standalone confidence while state has an active last_intent.
        """
        if not state.last_intent:
            return False

        q_lower = query.strip().lower()
        words = q_lower.split()

        # Interplay with Part 5: Answering a missing-slot clarification
        if state.awaiting_slot and (extracted_slots or len(words) <= 4):
            return True

        # Starts with follow-up conjunction
        if words and words[0] in FOLLOW_UP_CONJUNCTIONS:
            return True
        for conj in ["what about", "aur batao", "ane pachi", "ke liye", "mate"]:
            if conj in q_lower:
                return True

        # Short query with extracted slots and prior intent
        if len(words) <= 6 and extracted_slots:
            return True

        # Short query with low confidence and prior intent
        if len(words) <= 5 and intent_confidence < 0.60:
            return True

        return False

    def process_turn(
        self,
        query: str,
        incoming_state: Optional[Dict[str, Any]],
        detected_intent: str,
        intent_confidence: float,
        entities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes dialogue update, slot inheritance, and query rewriting.
        """
        # Parse or initialize state
        if incoming_state:
            state = DialogueState(**incoming_state)
        else:
            state = DialogueState(session_id="default_sess")

        # 1. Reset check
        if self.is_reset_query(query):
            new_state = DialogueState(session_id=state.session_id, is_reset=True)
            return {
                "is_reset": True,
                "is_follow_up": False,
                "standalone_query": query,
                "resolved_intent": "greeting",
                "resolved_confidence": 1.0,
                "updated_state": new_state.dict(),
                "rewrite_applied": False
            }

        extracted_slots = self.extract_slots_from_entities(entities, query=query)

        # Check if follow-up
        is_follow = self.is_follow_up(query, state, extracted_slots, intent_confidence)

        # Carry-over & override slots
        updated_slots = dict(state.slots)
        for k, v in extracted_slots.items():
            if v:
                updated_slots[k] = v

        if is_follow:
            resolved_intent = state.last_intent
            resolved_conf = max(intent_confidence, 0.85) # Boost confidence from dialogue continuity
        else:
            resolved_intent = detected_intent
            resolved_conf = intent_confidence

        # Rewrite query if follow-up
        standalone_query = query
        rewrite_applied = False

        if is_follow and state.last_intent:
            active_slot_strs = [f"{k} {v}" for k, v in updated_slots.items() if v]
            slots_repr = " ".join(active_slot_strs) if active_slot_strs else query
            template = INTENT_TEMPLATES.get(resolved_intent, f"{resolved_intent} for {{slots}}")
            standalone_query = template.format(slots=slots_repr)
            rewrite_applied = True

        # Update state model
        state.last_intent = resolved_intent
        state.slots = updated_slots
        state.awaiting_slot = None
        state.is_reset = False

        # Add turn record (keep last 5 turns)
        state.turns.append(TurnRecord(
            user_query=query,
            standalone_query=standalone_query,
            intent=resolved_intent,
            slots=updated_slots
        ))
        if len(state.turns) > 5:
            state.turns = state.turns[-5:]

        return {
            "is_reset": False,
            "is_follow_up": is_follow,
            "standalone_query": standalone_query,
            "resolved_intent": resolved_intent,
            "resolved_confidence": resolved_conf,
            "updated_state": state.dict(),
            "rewrite_applied": rewrite_applied
        }

dialogue_manager = DialogueManager()
