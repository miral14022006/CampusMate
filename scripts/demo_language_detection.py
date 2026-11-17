#!/usr/bin/env python3
"""
Interactive or standalone CLI demo for Feature 01: Multilingual Detection
"""
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "nlp-service"))

from features.language_detector.detector import LanguageDetector

DEMO_QUERIES = [
    ("English", "What is the procedure for semester registration?"),
    ("Hindi", "कॉलेज में छात्रवृत्ति फॉर्म कब तक जमा होंगे?"),
    ("Gujarati", "કમ્પ્યુટર એન્જિનિયરિંગ ડિપાર્ટમેન્ટમાં એડમિશન માટે કેટલી ફી છે?"),
    ("Hinglish", "Admission form submit karne ki last date kab hai?"),
    ("Gujlish", "College ma admission mate shu karvu ane fees ketli che?")
]

def main():
    print("=" * 70)
    print(" Multilingual College Assistant - Feature 01: Language Detection Demo")
    print("=" * 70)

    for label, query in DEMO_QUERIES:
        res = LanguageDetector.detect(query)
        print(f"Input ({label}): '{query}'")
        print(f" -> Detected: [{res['language']}] | Confidence: {res['confidence'] * 100:.0f}% | Transliterated: {res['is_transliterated']}")
        print("-" * 70)

if __name__ == "__main__":
    main()

