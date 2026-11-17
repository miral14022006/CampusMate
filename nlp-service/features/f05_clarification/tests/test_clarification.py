import unittest
from pathlib import Path
from features.f05_clarification.policy import DecisionPolicy, DecisionOutcome

class TestDecisionPolicy(unittest.TestCase):
    def setUp(self):
        self.policy = DecisionPolicy(
            t_high=0.65,
            t_low=0.35,
            margin_threshold=0.15,
            min_retrieval_score=0.01
        )

    def test_direct_answer_high_confidence(self):
        """High confidence intent with matching entity slots and valid retrieval returns ANSWER."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "exam_form_deadline", "confidence": 0.92},
                {"intent": "fee_payment_dates", "confidence": 0.05}
            ],
            entities=[],
            retrieved_chunks=[{"doc_name": "exam.txt", "score": 0.75}],
            language="en"
        )
        self.assertEqual(res["decision"], DecisionOutcome.ANSWER.value)
        self.assertIsNone(res["clarification_question"])
        self.assertEqual(len(res["quick_replies"]), 0)

    def test_clarify_ambiguous_margin(self):
        """When top-1 and top-2 intents have a small margin (< margin_threshold), trigger CLARIFY."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "exam_form_deadline", "confidence": 0.52},
                {"intent": "fee_payment_dates", "confidence": 0.46}
            ],
            entities=[],
            retrieved_chunks=[],
            language="hi-Latn"
        )
        self.assertEqual(res["decision"], DecisionOutcome.CLARIFY.value)
        self.assertIsNotNone(res["clarification_question"])
        self.assertGreaterEqual(len(res["quick_replies"]), 2)
        payloads = [qr["payload"] for qr in res["quick_replies"]]
        self.assertIn("exam_form_deadline", payloads)
        self.assertIn("fee_payment_dates", payloads)

    def test_clarify_intermediate_confidence(self):
        """When confidence is between T_low (0.35) and T_high (0.65), trigger CLARIFY."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "library_hours", "confidence": 0.50},
                {"intent": "wifi_network_access", "confidence": 0.20}
            ],
            entities=[],
            retrieved_chunks=[],
            language="en"
        )
        self.assertEqual(res["decision"], DecisionOutcome.CLARIFY.value)
        self.assertIn("Did you mean:", res["clarification_question"])

    def test_clarify_missing_required_slot(self):
        """exam_timetable requires SEMESTER. If missing, trigger CLARIFY for slot."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "exam_timetable", "confidence": 0.95}
            ],
            entities=[], # No SEMESTER entity
            retrieved_chunks=[{"score": 0.8}],
            language="gu"
        )
        self.assertEqual(res["decision"], DecisionOutcome.CLARIFY.value)
        self.assertIn("સેમેસ્ટર", res["clarification_question"])
        self.assertTrue(any("Sem 1" in qr["label"] for qr in res["quick_replies"]))

    def test_answer_when_required_slot_present(self):
        """exam_timetable with SEMESTER entity present proceeds to ANSWER."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "exam_timetable", "confidence": 0.95}
            ],
            entities=[{"label": "SEMESTER", "text": "5th semester"}],
            retrieved_chunks=[{"score": 0.8}],
            language="gu"
        )
        self.assertEqual(res["decision"], DecisionOutcome.ANSWER.value)

    def test_fallback_out_of_scope(self):
        """Out of scope or unconfident query triggers FALLBACK with contact routing."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "out_of_scope", "confidence": 0.25}
            ],
            entities=[],
            retrieved_chunks=[],
            language="hi"
        )
        self.assertEqual(res["decision"], DecisionOutcome.FALLBACK.value)
        self.assertIsNotNone(res["contact_info"])
        self.assertEqual(res["contact_info"]["department"], "general_helpdesk")

    def test_fallback_specific_department_contact(self):
        """Low confidence exam query routes to exam_cell in contact info."""
        res = self.policy.evaluate(
            top_intents=[
                {"intent": "re-evaluation", "confidence": 0.20}
            ],
            entities=[],
            retrieved_chunks=[],
            language="en"
        )
        self.assertEqual(res["decision"], DecisionOutcome.FALLBACK.value)
        self.assertEqual(res["contact_info"]["department"], "exam_cell")
        self.assertIn("exams@college.edu.in", res["clarification_question"])

if __name__ == "__main__":
    unittest.main()

