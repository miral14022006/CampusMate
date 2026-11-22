import unittest
from features.f06_dialogue_state.schemas import DialogueState
from features.f06_dialogue_state.manager import DialogueManager

class TestDialogueState(unittest.TestCase):
    def setUp(self):
        self.dm = DialogueManager()

    def test_first_turn_initialization(self):
        """First turn extracts entities, populates slots and tracks state."""
        res = self.dm.process_turn(
            query="What is the exam timetable for B.Tech CS 3rd sem?",
            incoming_state=None,
            detected_intent="exam_timetable",
            intent_confidence=0.95,
            entities=[
                {"label": "COURSE_NAME", "text": "B.Tech CS"},
                {"label": "SEMESTER", "text": "3rd sem"}
            ]
        )
        self.assertFalse(res["is_follow_up"])
        self.assertFalse(res["is_reset"])
        self.assertEqual(res["resolved_intent"], "exam_timetable")
        self.assertEqual(res["updated_state"]["slots"]["course"], "B.Tech CS")
        self.assertEqual(res["updated_state"]["slots"]["semester"], "3rd sem")
        self.assertEqual(len(res["updated_state"]["turns"]), 1)

    def test_slot_inheritance_and_override(self):
        """Follow-up overrides semester while inheriting course."""
        state = DialogueState(
            session_id="s1",
            last_intent="exam_timetable",
            slots={"course": "B.Tech CS", "branch": None, "semester": "3rd sem", "exam_type": None, "date": None}
        ).dict()

        res = self.dm.process_turn(
            query="aur 5th sem ke liye?",
            incoming_state=state,
            detected_intent="out_of_scope",
            intent_confidence=0.25,
            entities=[{"label": "SEMESTER", "text": "5th sem"}]
        )

        self.assertTrue(res["is_follow_up"])
        self.assertEqual(res["resolved_intent"], "exam_timetable")
        # Course inherited
        self.assertEqual(res["updated_state"]["slots"]["course"], "B.Tech CS")
        # Semester overridden
        self.assertEqual(res["updated_state"]["slots"]["semester"], "5th sem")
        self.assertTrue(res["rewrite_applied"])
        self.assertIn("5th sem", res["standalone_query"])
        self.assertIn("B.Tech CS", res["standalone_query"])

    def test_gujarati_elliptical_follow_up(self):
        """Elliptical query in Gujarati ('ane 7th sem mate?') correctly resolves."""
        state = DialogueState(
            session_id="s2",
            last_intent="exam_timetable",
            slots={"course": "Mechanical", "branch": "ME", "semester": "5th sem", "exam_type": None, "date": None}
        ).dict()

        res = self.dm.process_turn(
            query="ane 7th sem mate?",
            incoming_state=state,
            detected_intent="out_of_scope",
            intent_confidence=0.20,
            entities=[{"label": "SEMESTER", "text": "7th sem"}]
        )

        self.assertTrue(res["is_follow_up"])
        self.assertEqual(res["resolved_intent"], "exam_timetable")
        self.assertEqual(res["updated_state"]["slots"]["semester"], "7th sem")
        self.assertEqual(res["updated_state"]["slots"]["course"], "Mechanical")

    def test_reset_command_clears_slots(self):
        """Reset triggers (e.g. 'reset', 'new topic') wipe out active slots and session memory."""
        state = DialogueState(
            session_id="s3",
            last_intent="fee_payment_dates",
            slots={"course": "MBA", "branch": None, "semester": "1st sem", "exam_type": None, "date": None}
        ).dict()

        res = self.dm.process_turn(
            query="new topic",
            incoming_state=state,
            detected_intent="out_of_scope",
            intent_confidence=0.10,
            entities=[]
        )

        self.assertTrue(res["is_reset"])
        self.assertFalse(res["is_follow_up"])
        self.assertIsNone(res["updated_state"]["slots"]["course"])
        self.assertIsNone(res["updated_state"]["slots"]["semester"])
        self.assertIsNone(res["updated_state"]["last_intent"])

    def test_query_rewriting_transparency(self):
        """Standalone rewritten query accurately combines intent and accumulated slots."""
        state = DialogueState(
            session_id="s4",
            last_intent="fee_payment_dates",
            slots={"course": "B.Tech", "branch": "IT", "semester": "2nd sem", "exam_type": None, "date": None}
        ).dict()

        res = self.dm.process_turn(
            query="and for 4th sem?",
            incoming_state=state,
            detected_intent="out_of_scope",
            intent_confidence=0.30,
            entities=[{"label": "SEMESTER", "text": "4th sem"}]
        )

        self.assertTrue(res["is_follow_up"])
        self.assertIn("fee payment", res["standalone_query"].lower())
        self.assertIn("4th sem", res["standalone_query"])

    def test_clarification_slot_filling_interplay(self):
        """When awaiting a slot, student short response carries over to resolve the query."""
        state = DialogueState(
            session_id="s5",
            last_intent="exam_timetable",
            awaiting_slot="semester",
            slots={"course": "B.Tech CS", "branch": None, "semester": None, "exam_type": None, "date": None}
        ).dict()

        res = self.dm.process_turn(
            query="5th sem",
            incoming_state=state,
            detected_intent="out_of_scope",
            intent_confidence=0.15,
            entities=[{"label": "SEMESTER", "text": "5th sem"}]
        )

        self.assertTrue(res["is_follow_up"])
        self.assertEqual(res["resolved_intent"], "exam_timetable")
        self.assertEqual(res["updated_state"]["slots"]["semester"], "5th sem")
        self.assertEqual(res["updated_state"]["slots"]["course"], "B.Tech CS")

if __name__ == "__main__":
    unittest.main()

