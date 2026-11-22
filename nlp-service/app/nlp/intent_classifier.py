import os
import joblib
import numpy as np
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from app.core.config import settings

# 22 Required College Intents with comprehensive multi-query dataset
TRAIN_DATA = [
    # exam_form_deadline
    ("when is the exam registration deadline", "exam_form_deadline"),
    ("last date to submit exam form", "exam_form_deadline"),
    ("what is the final date for submitting examination form", "exam_form_deadline"),
    ("exam form bharne ki last date kab hai", "exam_form_deadline"),
    ("pariksha form bharvani chelli tarikh su che", "exam_form_deadline"),
    ("परीक्षा फॉर्म भरने की अंतिम तिथि क्या है", "exam_form_deadline"),
    ("પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ શું છે", "exam_form_deadline"),
    ("exam form last date", "exam_form_deadline"),
    ("examination form deadline", "exam_form_deadline"),
    
    # exam_timetable
    ("what is the exam timetable for cse", "exam_timetable"),
    ("when is the schedule for end sem exams", "exam_timetable"),
    ("exam timetable kab aayega", "exam_timetable"),
    ("datesheet for mtech mechanical robotics", "exam_timetable"),
    ("pariksha timetable aavyu che", "exam_timetable"),
    ("परीक्षा समय सारिणी कब आएगी", "exam_timetable"),
    ("પરીક્ષાનું ટાઇમટેબલ શું છે", "exam_timetable"),
    ("exam schedule and datesheet", "exam_timetable"),
    ("end semester exam time table", "exam_timetable"),

    # exam_date
    ("what date is the scientific writing exam", "exam_date"),
    ("numerical methods exam date and time", "exam_date"),
    ("exam date kya hai", "exam_date"),
    ("pariksha ni tarikh su che", "exam_date"),
    ("परीक्षा की तारीख क्या है", "exam_date"),
    ("when is my next exam", "exam_date"),

    # exam_eligibility
    ("who is eligible for end semester exam", "exam_eligibility"),
    ("exam eligibility criteria and minimum attendance", "exam_eligibility"),
    ("kya mai exam de sakta hu", "exam_eligibility"),
    ("eligibility for sitting in exams", "exam_eligibility"),

    # fee_payment
    ("how to pay semester fees online", "fee_payment"),
    ("fee payment portal link and process", "fee_payment"),
    ("fees kaise bhare online", "fee_payment"),
    ("fee bharva mate portal link aapo", "fee_payment"),
    ("फीस का भुगतान कैसे करें", "fee_payment"),
    ("pay tuition fees", "fee_payment"),

    # fee_structure
    ("what is the fee structure for btech computer engineering", "fee_structure"),
    ("tuition fees details per semester", "fee_structure"),
    ("fees kitni hai engineering ki", "fee_structure"),
    ("fee ketli chhe", "fee_structure"),
    ("hostel fee and mess charges breakdown", "fee_structure"),

    # scholarship
    ("available scholarships for merit students", "scholarship"),
    ("how to apply for college scholarship", "scholarship"),
    ("scholarship kaise milti hai", "scholarship"),
    ("scholarship mate apply kem karvu", "scholarship"),
    ("financial aid and scholarship details", "scholarship"),

    # hostel_information
    ("hostel rules and room allocation details", "hostel_information"),
    ("mess food timing and hostel fee", "hostel_information"),
    ("hostel mein mess ka khana kaisa hai", "hostel_information"),
    ("hostel na rules su che", "hostel_information"),
    ("छात्रावास के नियम और मेस का समय क्या है", "hostel_information"),

    # library_timings
    ("library opening and closing hours", "library_timings"),
    ("what time does the library close on weekends", "library_timings"),
    ("library kitne baje khulti hai", "library_timings"),
    ("library no samay su che", "library_timings"),
    ("पुस्तकालय खुलने और बंद होने का समय", "library_timings"),

    # result_information
    ("when will semester exam results be announced", "result_information"),
    ("how to check grade report and marksheet", "result_information"),
    ("result kab aayega", "result_information"),
    ("result kyare aavse", "result_information"),
    ("check exam marks and gpa", "result_information"),

    # revaluation
    ("rechecking and revaluation application fee", "revaluation"),
    ("how to apply for paper recheck", "revaluation"),
    ("revaluation form kaise bhare", "revaluation"),

    # attendance_rules
    ("what is the minimum attendance percentage required", "attendance_rules"),
    ("is 75 percent attendance mandatory for exams", "attendance_rules"),
    ("attendance review dates", "attendance_rules"),
    ("attendance rules kya hain", "attendance_rules"),

    # bonafide_certificate
    ("how to get a bonafide certificate", "bonafide_certificate"),
    ("apply for bonafide letter from student section", "bonafide_certificate"),
    ("bonafide certificate kaise milega", "bonafide_certificate"),

    # placement_information
    ("placement statistics and average package", "placement_information"),
    ("campus placement companies visiting this year", "placement_information"),
    ("placement cell contact details", "placement_information"),

    # academic_calendar
    ("when is the academic calendar 2026-27 released", "academic_calendar"),
    ("dissertation submission deadline in academic calendar", "academic_calendar"),
    ("academic calendar kahan milega", "academic_calendar"),
    ("academic calendar dates", "academic_calendar"),

    # holiday_information
    ("list of general holidays 2024", "holiday_information"),
    ("is independence day a holiday in 2024", "holiday_information"),
    ("makar sankranti holiday date", "holiday_information"),
    ("chutti kab hai agle hafte", "holiday_information"),
    ("raja kyare chhe", "holiday_information"),

    # admission_information
    ("admission procedure and cutoff criteria", "admission_information"),
    ("admission requirements for mtech", "admission_information"),

    # course_information
    ("course syllabus and subjects for semester 1", "course_information"),
    ("what is the course code for numerical methods", "course_information"),

    # document_requirements
    ("documents required for admission verification", "document_requirements"),
    ("which certificates are needed for registration", "document_requirements"),

    # contact_information
    ("contact number for examination cell", "contact_information"),
    ("email address of admin office and registrar", "contact_information"),

    # general_college_information
    ("about pandit deendayal energy university", "general_college_information"),
    ("campus facilities and infrastructure", "general_college_information"),

    # out_of_scope
    ("who is the president of france", "out_of_scope"),
    ("what is the capital of australia", "out_of_scope"),
    ("write a python script for binary search", "out_of_scope"),
    ("how to make a chocolate cake", "out_of_scope"),
    ("tell me a joke about robots", "out_of_scope"),
    ("tell me a joke about cats", "out_of_scope"),
    ("who won the world cup in 2022", "out_of_scope")
]

class IntentClassifier:
    def __init__(self):
        self.model_path = os.path.join(settings.INDEX_DIR, "intent_classifier.joblib")
        self.vectorizer_path = os.path.join(settings.INDEX_DIR, "intent_vectorizer.joblib")
        self.vectorizer = None
        self.classifier = None
        self.train_and_save()

    def train_and_save(self):
        X = [item[0] for item in TRAIN_DATA]
        y = [item[1] for item in TRAIN_DATA]

        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
        X_vec = self.vectorizer.fit_transform(X)

        self.classifier = LogisticRegression(C=5.0, max_iter=300, random_state=42)
        self.classifier.fit(X_vec, y)

        os.makedirs(settings.INDEX_DIR, exist_ok=True)
        joblib.dump(self.vectorizer, self.vectorizer_path)
        joblib.dump(self.classifier, self.model_path)

    def classify(self, query: str) -> Dict[str, Any]:
        """Classify query intent with probability estimation."""
        if not query or not query.strip():
            return {"intent": "out_of_scope", "confidence": 0.0, "method": "tfidf_logistic_regression"}

        vec = self.vectorizer.transform([query])
        probs = self.classifier.predict_proba(vec)[0]
        max_idx = np.argmax(probs)
        intent = self.classifier.classes_[max_idx]
        confidence = float(probs[max_idx])

        # Gating: if maximum confidence is low, set to out_of_scope
        if confidence < 0.15:
            intent = "out_of_scope"

        return {
            "intent": intent,
            "confidence": round(confidence, 4),
            "method": "tfidf_logistic_regression"
        }

intent_classifier = IntentClassifier()
