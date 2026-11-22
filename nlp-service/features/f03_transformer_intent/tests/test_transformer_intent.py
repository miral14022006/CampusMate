import unittest
from features.f03_transformer_intent.inference import MurilIntentClassifier
from features.f03_transformer_intent.base import BaseIntentClassifier
from features.f03_transformer_intent.calibration import calculate_ece, apply_temperature_scaling
import numpy as np

class TestTransformerIntent(unittest.TestCase):
    def setUp(self):
        self.clf = MurilIntentClassifier()

    def test_interface_compliance(self):
        self.assertIsInstance(self.clf, BaseIntentClassifier)
        self.assertTrue(hasattr(self.clf, "predict"))
        self.assertTrue(hasattr(self.clf, "name"))

    def test_prediction_structure_and_top3(self):
        query = "Exam form bharne ki last date kab hai bhai?"
        res = self.clf.predict(query)

        self.assertIn("intent", res)
        self.assertIn("confidence", res)
        self.assertIn("is_fallback", res)
        self.assertIn("top3", res)

        self.assertEqual(len(res["top3"]), 3)
        self.assertEqual(res["intent"], "exam_form_deadline")
        self.assertGreater(res["confidence"], 0.2)

    def test_temperature_calibration_and_ece(self):
        logits = np.array([[2.5, 0.5, -1.0], [0.1, 2.8, -0.5]])
        scaled_probs = apply_temperature_scaling(logits, temperature=1.2)

        # Probabilities sum to 1
        np.testing.assert_almost_equal(np.sum(scaled_probs, axis=1), [1.0, 1.0])

        y_true = np.array([0, 1])
        ece = calculate_ece(y_true, scaled_probs)
        self.assertGreaterEqual(ece, 0.0)
        self.assertLessEqual(ece, 1.0)

if __name__ == "__main__":
    unittest.main()

