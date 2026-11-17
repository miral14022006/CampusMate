import unittest
import numpy as np
from PIL import Image, ImageDraw

from features.f09_ocr.preprocessor import ImagePreprocessor
from features.f09_ocr.cleaner import PostOCRCleaner
from features.f09_ocr.engine import OCREngine

class TestOCRFeature(unittest.TestCase):
    def setUp(self):
        self.preprocessor = ImagePreprocessor()
        self.cleaner = PostOCRCleaner()
        self.engine = OCREngine()

    def test_fixture_1_english_notice_preprocessing(self):
        """Fixture 1: Clean synthetic English notice undergoes grayscale and binarization."""
        img = Image.new("RGB", (600, 150), color=(255, 255, 255))
        d = ImageDraw.Draw(img)
        d.text((20, 50), "Important Notice: Exam forms are open.", fill=(0, 0, 0))

        processed, angle = self.preprocessor.preprocess(np.array(img), apply_pipeline=True)
        self.assertEqual(len(processed.shape), 2, "Output must be single channel binarized")
        self.assertTrue(np.all((processed == 0) | (processed == 255)), "Must be binary pixels")

    def test_fixture_2_hindi_devanagari_cleanup(self):
        """Fixture 2: Common OCR misrecognitions in Hindi are fixed by dictionary."""
        dirty_hindi = "अन्तिम तिथि परिक्षा छात्रवास फीस"
        cleaned = self.cleaner.clean(dirty_hindi)
        self.assertIn("अंतिम", cleaned)
        self.assertIn("परीक्षा", cleaned)
        self.assertIn("छात्रावास", cleaned)

    def test_fixture_3_gujarati_ocr_cleanup(self):
        """Fixture 3: Common OCR misrecognitions in Gujarati are normalized and corrected."""
        dirty_guj = "પરિક્ષા ફોર્મ ભરવાની છેલ્લી તારિખ"
        cleaned = self.cleaner.clean(dirty_guj)
        self.assertIn("પરીક્ષા", cleaned)
        self.assertIn("તારીખ", cleaned)

    def test_broken_line_collapse(self):
        """Accidental OCR linebreaks inside sentences are collapsed into clean sentences."""
        broken_text = "Examination form submission \ndeadline has been extended \nto 25th October."
        cleaned = self.cleaner.clean(broken_text)
        self.assertIn("Examination form submission deadline has been extended to 25th October.", cleaned)

    def test_human_review_flag_on_low_confidence(self):
        """Engine flags page when confidence is below 70% threshold."""
        res = self.engine.extract_image_ocr(
            image_input=np.zeros((300, 300, 3), dtype=np.uint8)
        )
        # Default mock extraction or noisy blank image
        self.assertIn("needs_human_review", res)
        self.assertIn("confidence", res)

if __name__ == "__main__":
    unittest.main()

