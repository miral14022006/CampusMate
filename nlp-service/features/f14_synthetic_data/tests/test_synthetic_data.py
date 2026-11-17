import unittest
import pandas as pd
from features.f14_synthetic_data.generator import generate_combinatorial_paraphrases
from features.f14_synthetic_data.postprocess import postprocessor
from features.f14_synthetic_data.llm.base import BaseLLMProvider
from features.f14_synthetic_data.llm import get_llm_provider

class DummyLLM(BaseLLMProvider):
    def generate(self, prompt: str, system_prompt: str = None, temperature: float = 0.8) -> str:
        return '[{"text": "Dummy query for testing?", "language": "en", "intent": "exam_timetable"}]'

class TestFeature14SyntheticData(unittest.TestCase):
    def test_combinatorial_generator(self):
        samples = generate_combinatorial_paraphrases("exam_form_deadline", count=25)
        self.assertGreaterEqual(len(samples), 20)
        langs = {s["language"] for s in samples}
        self.assertTrue({"en", "hi", "gu", "hi-Latn", "gu-Latn"}.issubset(langs))
        for s in samples:
            self.assertEqual(s["intent"], "exam_form_deadline")
            self.assertTrue(len(s["text"]) > 5)

    def test_postprocessor_deduplication(self):
        df = pd.DataFrame([
            {"text": "What is the fee for computer engineering?", "intent": "fee_structure", "language": "en"},
            {"text": "What is the fee for computer engineering?", "intent": "fee_structure", "language": "en"},
            {"text": "What is the fee for computer engineering please?", "intent": "fee_structure", "language": "en"}
        ])
        df_exact = postprocessor.exact_deduplicate(df)
        self.assertEqual(len(df_exact), 2)

        df_fuzzy = postprocessor.fuzzy_deduplicate(df_exact)
        self.assertLessEqual(len(df_fuzzy), 2)

    def test_language_validator(self):
        df = pd.DataFrame([
            {"text": "What is the admission procedure?", "intent": "admission", "language": "en"},
            {"text": "કોલેજ ફી કેટલી છે?", "intent": "fee_structure", "language": "gu"},
            {"text": "This is totally english text", "intent": "admission", "language": "hi"} # Mislabeled
        ])
        valid_df, dropped = postprocessor.validate_languages(df)
        self.assertEqual(dropped, 1)
        self.assertEqual(len(valid_df), 2)

    def test_dummy_llm_provider(self):
        dummy = DummyLLM()
        res = dummy.generate("test")
        self.assertIn("Dummy query", res)

if __name__ == "__main__":
    unittest.main()

