import unittest
from features.language_detector.detector import LanguageDetector

class TestLanguageDetector(unittest.TestCase):
    def test_english_detection(self):
        text = "What is the admission procedure for Computer Engineering?"
        res = LanguageDetector.detect(text)
        self.assertEqual(res["language"], "en")
        self.assertFalse(res["is_transliterated"])

    def test_hindi_detection(self):
        text = "कंप्यूटर इंजीनियरिंग के लिए प्रवेश प्रक्रिया क्या है?"
        res = LanguageDetector.detect(text)
        self.assertEqual(res["language"], "hi")
        self.assertFalse(res["is_transliterated"])

    def test_gujarati_detection(self):
        text = "કમ્પ્યુટર એન્જિનિયરિંગમાં એડમિશન પ્રક્રિયા શું છે?"
        res = LanguageDetector.detect(text)
        self.assertEqual(res["language"], "gu")
        self.assertFalse(res["is_transliterated"])

    def test_hinglish_detection(self):
        text = "College me admission kaise lena hai aur fees kitni hai?"
        res = LanguageDetector.detect(text)
        self.assertEqual(res["language"], "hi-Latn")
        self.assertTrue(res["is_transliterated"])

    def test_gujlish_detection(self):
        text = "College ma admission mate shu karvu ane fees ketli che?"
        res = LanguageDetector.detect(text)
        self.assertEqual(res["language"], "gu-Latn")
        self.assertTrue(res["is_transliterated"])

    def test_empty_string(self):
        res = LanguageDetector.detect("")
        self.assertEqual(res["language"], "en")

if __name__ == "__main__":
    unittest.main()
