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

NEW_TOPIC_KEYWORDS = {
    "fee", "fees", "fee payment", "fee structure", "tuition", "challan", "paisa", "rupee", "rupees", "bharna", "bharvani",
    "hostel", "room", "mess", "curfew", "warden",
    "bus", "transport", "pass", "route",
    "library", "book", "books",
    "syllabus", "curriculum", "subject", "subjects",
    "placement", "package", "salary", "recruiter", "company", "companies",
    "admission", "cutoff", "eligibility", "merit",
    "result", "grade", "spi", "cpi", "cgpa", "re-evaluation", "rechecking",
    "attendance", "bunk", "leave", "holiday", "vacation",
    # Hindi & Gujarati keywords
    "फीस", "शुल्क", "होस्टल", "हॉस्टल", "मेस", "परीक्षा", "समय सारिणी", "तारीख", "कैलेंडर", "अवकाश",
    "ફી", "હોસ્ટેલ", "મેસ", "પરીક્ષા", "સમયપત્રક", "તારીખ", "કેલેન્ડર", "રજા"
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

# Branch normalizations mapping patterns to canonical branch names
BRANCH_PATTERNS = [
    (r"\b(ict|information\s*(?:&|and)\s*communication\s*technology)\b", "ICT"),
    (r"\b(cse|computer\s*science(?:\s*(?:&|and)\s*engineering)?)\b", "Computer Engineering"),
    (r"\b(ce|computer\s*engineering)\b", "Computer Engineering"),
    (r"\b(it|information\s*technology)\b", "Information Technology"),
    (r"\b(ece|electronics\s*(?:&|and)\s*communication(?:\s*engineering)?)\b", "ECE"),
    (r"\b(ee|electrical\s*engineering)\b", "Electrical Engineering"),
    (r"\b(me|mech|mechanical(?:\s*engineering)?)\b", "Mechanical Engineering"),
    (r"\b(civil(?:\s*engineering)?)\b", "Civil Engineering"),
    (r"\b(chemical(?:\s*engineering)?)\b", "Chemical Engineering"),
    (r"\b(csbs|computer\s*science\s*and\s*business\s*systems)\b", "CSBS"),
    (r"\b(data\s*science)\b", "Data Science"),
    (r"\b(aiml|ai\s*(?:&|and)\s*ml|artificial\s*intelligence)\b", "AI & ML"),
    (r"\b(bca)\b", "BCA"),
    (r"\b(mca)\b", "MCA"),
    (r"\b(mba)\b", "MBA"),
    (r"\b(b\.?tech)\b", "B.Tech"),
    (r"\b(m\.?tech)\b", "M.Tech"),
]

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
                new_slots["course"] = text

        if query:
            q_lower = query.lower()

            # Check branch patterns with high fidelity
            for pat, canonical in BRANCH_PATTERNS:
                if re.search(pat, q_lower):
                    new_slots["branch"] = canonical
                    if "course" not in new_slots:
                        new_slots["course"] = canonical
                    break

            # Semester extraction
            if "semester" not in new_slots or not new_slots["semester"]:
                sem_match = re.search(r"\b(?:sem(?:ester)?\s*([1-8])|([1-8])\s*(?:st|nd|rd|th)?\s*sem(?:ester)?|(?:semester|sem)\s*(i|ii|iii|iv|v|vi|vii|viii))\b", q_lower)
                if sem_match:
                    num = sem_match.group(1) or sem_match.group(2)
                    if num:
                        new_slots["semester"] = f"Semester {num}"
                    else:
                        roman = sem_match.group(3).lower()
                        roman_map = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8}
                        if roman in roman_map:
                            new_slots["semester"] = f"Semester {roman_map[roman]}"
                        else:
                            new_slots["semester"] = sem_match.group(0).title()

            # Hostels / general courses
            if "course" not in new_slots or not new_slots["course"]:
                for c in ["girls hostel", "boys hostel", "hostel"]:
                    if c in q_lower:
                        new_slots["course"] = c.title()
                        break

            # Locations
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
        intent_confidence: float,
        detected_intent: Optional[str] = None
    ) -> bool:
        """
        Determines whether the incoming query is an elliptical or follow-up query.
        """
        if not state.last_intent:
            return False

        q_lower = query.strip().lower()
        words = q_lower.split()

        # If detected intent is clearly confident and different from last_intent, it is NOT a follow-up
        if detected_intent and detected_intent != "general_faq" and detected_intent != state.last_intent and intent_confidence >= 0.50:
            return False

        # If the query introduces a clear new domain keyword, do NOT treat it as a follow-up to an old intent
        q_clean = q_lower.replace("?", " ").replace("!", " ")
        q_tokens = set(re.findall(r"\b\w+\b", q_clean)).union(set(q_clean.split()))
        matched_new_topics = q_tokens.intersection(NEW_TOPIC_KEYWORDS)
        if matched_new_topics:
            # If the last intent was exam_timetable, but query asks about fees/hostel/bus/etc., NOT follow-up
            if state.last_intent == "exam_timetable" and any(k in matched_new_topics for k in ["fee", "fees", "tuition", "challan", "hostel", "bus", "placement", "admission", "फीस", "शुल्क", "होस्टल", "हॉस्टल", "ફી", "હોસ્ટેલ"]):
                return False
            # Similarly, if last intent was fee, and user asks about timetable/exam/hostel/etc., NOT follow-up
            if "fee" in state.last_intent and any(k in matched_new_topics for k in ["hostel", "bus", "placement", "admission", "syllabus", "होस्टल", "हॉस्टल", "હોસ્ટેલ"]):
                return False
            # If last intent was out_of_scope and query contains topic keywords, it is a new topic, NOT a follow up
            if state.last_intent == "out_of_scope":
                return False

        # Answering a missing-slot clarification
        if state.awaiting_slot and (extracted_slots or len(words) <= 4):
            return True

        # If previous intent was out_of_scope, general_faq, or greeting, do NOT treat new queries as follow-ups
        if state.last_intent in ["out_of_scope", "general_faq", "greeting"]:
            return False

        # Starts with follow-up conjunction
        if words and words[0] in FOLLOW_UP_CONJUNCTIONS:
            return True
        for conj in ["what about", "aur batao", "ane pachi", "ke liye", "mate"]:
            if conj in q_lower:
                return True

        # Short query with extracted slots under same topic context
        if len(words) <= 6 and extracted_slots:
            return True

        # Short query with low confidence and prior intent (only if no new topic keywords found)
        # Only valid if last_intent was an actual college domain intent (not out_of_scope/generic)
        if len(words) <= 5 and intent_confidence < 0.50 and not matched_new_topics and state.last_intent in INTENT_TEMPLATES:
            return True

        # Follow-up phrases asking for details/subjects/dates under previous topic
        followup_phrases = [
            "give all", "all the subject", "all subjects", "with date", "badha subject",
            "badhi information", "give all subjects", "all subjects with date", "tell me date",
            "badha vishayo", "badha vishay", "give timetable", "tell timetable"
        ]
        if any(p in q_lower for p in followup_phrases):
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
            if isinstance(incoming_state, dict) and "session_id" not in incoming_state:
                incoming_copy = dict(incoming_state)
                if any(k in incoming_copy for k in ("branch", "semester", "course")):
                    incoming_copy = {"session_id": "default_sess", "slots": incoming_copy}
                else:
                    incoming_copy["session_id"] = "default_sess"
                state = DialogueState(**incoming_copy)
            else:
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
        is_follow = self.is_follow_up(
            query,
            state,
            extracted_slots,
            intent_confidence,
            detected_intent=detected_intent
        )

        # Slot inheritance / override
        updated_slots = dict(state.slots)
        if is_follow:
            resolved_intent = state.last_intent
            resolved_conf = max(intent_confidence, 0.85)
            # Update with newly extracted slots (override old slot values if specified)
            for k, v in extracted_slots.items():
                if v:
                    updated_slots[k] = v
        else:
            resolved_intent = detected_intent
            resolved_conf = intent_confidence
            # New topic: if user specified new slots, start fresh or retain compatible slots
            # If changing branch or intent, replace slots
            if extracted_slots:
                # If new branch/course is extracted, override previous branch/course
                for k, v in extracted_slots.items():
                    if v:
                        updated_slots[k] = v
            # If intent changed completely (e.g. from exam to fee), don't force old exam-specific slots
            if state.last_intent and resolved_intent != state.last_intent:
                if "exam" in state.last_intent and "exam" not in resolved_intent:
                    updated_slots.pop("exam_type", None)

        # Standalone query generation
        standalone_query = query
        rewrite_applied = False

        if is_follow:
            parts = []
            if updated_slots.get("branch"):
                parts.append(str(updated_slots["branch"]))
            if updated_slots.get("semester"):
                parts.append(str(updated_slots["semester"]))
            slots_repr = " ".join(parts) if parts else query

            template = INTENT_TEMPLATES.get(resolved_intent)
            if template:
                standalone_query = template.format(slots=slots_repr)
            elif parts:
                standalone_query = f"{query} for {slots_repr}"
            else:
                standalone_query = query
            rewrite_applied = True
        else:
            # Even if not follow up, if branch or semester is explicitly in query or updated_slots, ensure query includes it if query is very short
            if updated_slots.get("branch") and updated_slots.get("branch").lower() not in query.lower() and len(query.split()) <= 4:
                # E.g. "fee details" -> "fee details for Computer Engineering"
                pass

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
