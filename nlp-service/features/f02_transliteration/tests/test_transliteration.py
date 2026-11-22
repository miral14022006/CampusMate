import unittest
from features.f02_transliteration.engine import transliteration_engine

class TestTransliteration20Examples(unittest.TestCase):
    def test_20_handwritten_examples(self):
        examples = [
            # 10 Hinglish -> Hindi (Devanagari)
            ("kab", "hi-Latn", "कब"),
            ("kya", "hi-Latn", "क्या"),
            ("kaise", "hi-Latn", "कैसे"),
            ("kyun", "hi-Latn", "क्यों"),
            ("hai", "hi-Latn", "है"),
            ("bharne", "hi-Latn", "भरने"),
            ("tarikh", "hi-Latn", "तारीख"),
            ("batao", "hi-Latn", "बताओ"),
            ("chahiye", "hi-Latn", "चाहिए"),
            ("kitna", "hi-Latn", "कितना"),

            # 10 Gujlish -> Gujarati (Gujarati script)
            ("shu", "gu-Latn", "શું"),
            ("kem", "gu-Latn", "કેમ"),
            ("kyare", "gu-Latn", "ક્યારે"),
            ("che", "gu-Latn", "છે"),
            ("chhe", "gu-Latn", "છે"),
            ("ketli", "gu-Latn", "કેટલી"),
            ("aavshe", "gu-Latn", "આવશે"),
            ("karvu", "gu-Latn", "કરવું"),
            ("joyiye", "gu-Latn", "જોઈએ"),
            ("mate", "gu-Latn", "માટે")
        ]

        for token, lang, expected_native in examples:
            result = transliteration_engine.transliterate_token(token, lang)
            self.assertEqual(
                result,
                expected_native,
                f"Failed transliterating '{token}' ({lang}): got '{result}', expected '{expected_native}'"
            )

    def test_english_token_preservation(self):
        english_terms = ["exam", "form", "fees", "hostel", "semester", "admission", "library"]
        for term in english_terms:
            hi_res = transliteration_engine.transliterate_token(term, "hi-Latn")
            gu_res = transliteration_engine.transliterate_token(term, "gu-Latn")
            self.assertEqual(hi_res, term, f"English token '{term}' should not be transliterated in Hinglish")
            self.assertEqual(gu_res, term, f"English token '{term}' should not be transliterated in Gujlish")

    def test_sentence_dual_form(self):
        sentence = "Exam form bharne ki last date kab hai"
        translit, dual = transliteration_engine.transliterate_text(sentence, "hi-Latn")
        # Exam, form, last, date remain English
        self.assertIn("Exam", translit)
        self.assertIn("form", translit)
        self.assertIn("भरने", translit)
        self.assertIn("कब", translit)
        self.assertIn("है", translit)
        # Dual form has both
        self.assertIn("Exam", dual)
        self.assertIn("भरने", dual)

if __name__ == "__main__":
    unittest.main()

