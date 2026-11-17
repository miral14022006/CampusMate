import unittest
from features.f04_rag.engine import RAGEngine
from features.f04_rag.verifier import HallucinationGuard
from features.f04_rag.prompt_builder import GroundedPromptBuilder

class TestRAGEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RAGEngine(min_evidence_score=0.01)
        self.guard = HallucinationGuard()
        self.builder = GroundedPromptBuilder()

    def test_evidence_strength_gate_triggers_idk(self):
        """When top retrieval score is below threshold, gate intercepts and outputs IDK without LLM call."""
        res = self.engine.generate_answer(
            query="What is the astronomy club president name?",
            retrieved_chunks=[{"doc_name": "general.txt", "score": 0.002, "text": "irrelevant text"}],
            language="en"
        )
        self.assertEqual(res.mode, "idk")
        self.assertTrue(res.grounded)
        self.assertEqual(len(res.citations), 0)
        self.assertIn("do not contain sufficient information", res.answer)

    def test_evidence_gate_multilingual_idk(self):
        """IDK messages adapt to user detected language (Hindi, Gujarati, Hinglish)."""
        res_hi = self.engine.generate_answer(
            query="स्विमिंग पूल का समय क्या है?",
            retrieved_chunks=[{"doc_name": "doc.txt", "score": 0.001, "text": "text"}],
            language="hi"
        )
        self.assertIn("आधिकारिक कॉलेज दस्तावेजों", res_hi.answer)

        res_gu = self.engine.generate_answer(
            query="સ્વિમિંગ પુલ નો સમય શું છે?",
            retrieved_chunks=[{"doc_name": "doc.txt", "score": 0.001, "text": "text"}],
            language="gu"
        )
        self.assertIn("સત્તાવાર કૉલેજ દસ્તાવેજોમાં", res_gu.answer)

    def test_prompt_builder_structure_and_citations(self):
        """Builder creates numbered context blocks matching citation numbers."""
        sys_p, user_p, indexed = self.builder.build_prompt(
            query="When are fees due?",
            retrieved_chunks=[
                {"doc_name": "fees.pdf", "page": 3, "upload_date": "2024-07-01", "score": 0.9, "text": "Fees due by 15th Aug."}
            ],
            language="en"
        )
        self.assertEqual(len(indexed), 1)
        self.assertEqual(indexed[0]["citation_id"], 1)
        self.assertIn("[1] Source: fees.pdf", user_p)
        self.assertIn("citing evidence as [1]", user_p)

    def test_citation_parsing_and_grounded_verification(self):
        """Verifier validates citations when all facts appear in cited context."""
        context = [
            {"citation_id": 1, "doc_name": "exam.pdf", "page": 1, "full_text": "Exam fees are ₹500 and last date is 25th October 2024."}
        ]
        answer = "Exam fees are ₹500 and deadline is 25th October 2024 [1]."
        verif = self.guard.verify(answer, context)

        self.assertTrue(verif["grounded"])
        self.assertEqual(verif["hallucination_score"], 0.0)
        self.assertEqual(verif["cited_indices"], [1])
        self.assertEqual(len(verif["invalid_citations"]), 0)

    def test_hallucination_detection_invented_facts(self):
        """Verifier catches numbers/dates not present in the context chunk."""
        context = [
            {"citation_id": 1, "doc_name": "exam.pdf", "page": 1, "full_text": "Exam fees are ₹500 and last date is 25th October 2024."}
        ]
        # Invented ₹9000 and 12th December
        answer = "The fees are ₹9000 and last date is 12th December 2025 [1]."
        verif = self.guard.verify(answer, context)

        self.assertFalse(verif["grounded"])
        self.assertGreater(verif["hallucination_score"], 0.0)
        self.assertIn("9000", str(verif["unsupported_facts"]))

    def test_invalid_citation_index_fails_verification(self):
        """Citing non-existent chunk numbers triggers hallucination penalty."""
        context = [
            {"citation_id": 1, "doc_name": "exam.pdf", "page": 1, "full_text": "Exam schedule is published."}
        ]
        answer = "The schedule is out [99]." # [99] does not exist
        verif = self.guard.verify(answer, context)

        self.assertFalse(verif["grounded"])
        self.assertIn(99, verif["invalid_citations"])

    def test_date_conflict_resolution(self):
        """Chunks with newer upload_date are ordered before older revisions."""
        chunks = [
            {"doc_name": "v1.txt", "upload_date": "2023-01-01", "score": 0.8},
            {"doc_name": "v2.txt", "upload_date": "2024-05-01", "score": 0.8}
        ]
        ordered = self.engine.resolve_date_conflicts(chunks)
        self.assertEqual(ordered[0]["doc_name"], "v2.txt")

if __name__ == "__main__":
    unittest.main()
