import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import NLP_API_KEY, API_KEY_HEADER_NAME

class TestEndToEndQueries(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.headers = {API_KEY_HEADER_NAME: NLP_API_KEY}

    def test_six_sample_queries_e2e(self):
        queries = [
            # 1. English Tuition Fees
            {
                "query": "What is the fee structure for BTech Computer Engineering?",
                "expected_lang": "en",
                "expected_intent": "fee_structure"
            },
            # 2. Hindi Hostel Rules
            {
                "query": "कॉलेज में छात्रावास मेस का खाना और नियम क्या हैं?",
                "expected_lang": "hi",
                "expected_intent": "hostel"
            },
            # 3. Gujarati Library Timings
            {
                "query": "સેન્ટ્રલ લાઈબ્રેરીનો સમય શું છે અને પુસ્તકો કેવી રીતે ઈશ્યુ કરાવી શકાય?",
                "expected_lang": "gu",
                "expected_intent": "library_timings"
            },
            # 4. Hinglish Exam Deadline
            {
                "query": "Exam form bharne ki last date kab hai late fees lagegi kya?",
                "expected_lang": "hi-Latn",
                "expected_intent": "exam_form_deadline"
            },
            # 5. Gujlish Fees
            {
                "query": "College ma admission mate ketli fees chhe ane form kyare aavshe?",
                "expected_lang": "gu-Latn",
                "expected_intent": "admission"
            },
            # 6. English Placement
            {
                "query": "What was the highest placement package offered last year?",
                "expected_lang": "en",
                "expected_intent": "placement"
            }
        ]

        for item in queries:
            q = item["query"]
            res = self.client.post("/v1/query", json={"query": q}, headers=self.headers)
            self.assertEqual(res.status_code, 200, f"Failed on query: {q}")
            data = res.json()

            self.assertEqual(data["language"], item["expected_lang"], f"Lang mismatch for '{q}'")
            self.assertTrue(len(data["answer"]) > 10, f"Empty answer for '{q}'")
            # Low-confidence intents are intentionally routed to a clarification
            # or helpdesk fallback by Feature 05 instead of guessing a source.
            self.assertTrue(
                data["source_doc"] is not None
                or data["decision"] in ("CLARIFY", "FALLBACK")
                or (data["clarification_question"] or "").strip() != "",
                f"Missing source doc and clarification for '{q}'"
            )
            self.assertGreater(data["execution_time_ms"], 0.0)

if __name__ == "__main__":
    unittest.main()

