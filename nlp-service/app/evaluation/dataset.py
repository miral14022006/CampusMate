import json
import os
import random
from typing import List

INTENTS = [
    "exam_form_deadline", "exam_timetable", "exam_date", "exam_eligibility",
    "fee_payment", "fee_structure", "scholarship", "hostel_information",
    "library_timings", "result_information", "revaluation", "attendance_rules",
    "bonafide_certificate", "placement_information", "academic_calendar",
    "holiday_information", "admission_information", "course_information",
    "document_requirements", "contact_information", "general_college_information",
    "out_of_scope"
]

LANGUAGES = ["en", "hi", "gu", "hinglish", "gujlish"]

QUERY_TEMPLATES = {
    "exam_form_deadline": {
        "en": "When is the last date to submit the exam form?",
        "hi": "परीक्षा फॉर्म भरने की अंतिम तारीख क्या है?",
        "gu": "પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ શું છે?",
        "hinglish": "Exam form bharne ki last date kab hai?",
        "gujlish": "Exam form bharvani last date su che?"
    },
    "exam_timetable": {
        "en": "What is the exam timetable for MTech Computer Engineering?",
        "hi": "एमटेक कंप्यूटर इंजीनियरिंग की परीक्षा समय सारिणी क्या है?",
        "gu": "એમટેક કમ્પ્યુટર એન્જિનિયરિંગનું પરીક્ષા સમયપત્રક શું છે?",
        "hinglish": "MTech Computer Engineering ka exam timetable kya hai?",
        "gujlish": "MTech Computer Engineering nu exam timetable su chhe?"
    },
    "holiday_information": {
        "en": "When was Independence Day holiday observed in 2024?",
        "hi": "2024 में स्वतंत्रता दिवस की छुट्टी कब थी?",
        "gu": "2024 માં સ્વતંત્રતા દિવસની રજા ક્યારે હતી?",
        "hinglish": "2024 mein Independence Day holiday kab tha?",
        "gujlish": "2024 ma Independence Day ni chutti kyare hati?"
    },
    "academic_calendar": {
        "en": "When is the dissertation submission deadline in academic calendar?",
        "hi": "शैक्षणिक कैलेंडर में शोध प्रबंध जमा करने की अंतिम तिथि क्या है?",
        "gu": "શૈક્ષણિક કેલેન્ડરમાં સંશોધન પત્ર જમા કરવાની છેલ્લી તારીખ કઈ છે?",
        "hinglish": "Academic calendar mein dissertation submission date kab hai?",
        "gujlish": "Academic calendar ma dissertation submission date kyare chhe?"
    },
    "out_of_scope": {
        "en": "Who won the FIFA World Cup in 2022?",
        "hi": "2022 का फीफा विश्व कप किसने जीता?",
        "gu": "2022 માં ફિફા વર્લ્ડ કપ કોણે જીત્યો?",
        "hinglish": "2022 ka football world cup kisne jeeta?",
        "gujlish": "2022 ma football world cup kone jityo?"
    }
}

def generate_eval_dataset(target_count: int = 210) -> List[dict]:
    dataset = []
    id_counter = 1

    # Base seed questions
    for intent, lang_dict in QUERY_TEMPLATES.items():
        for lang, text in lang_dict.items():
            dataset.append({
                "id": f"q_{id_counter}",
                "query": text,
                "expected_language": lang,
                "expected_intent": intent,
                "gold_source": "FoET__PG__-_End_Semester_Exam_Time_Table_-_Nov_-_Dec_-_2026_1795117599079.pdf" if "exam" in intent else ("List_of_General_Holidays-2024_1795166011274.pdf" if "holiday" in intent else None)
            })
            id_counter += 1

    # Paraphrases and variations to reach 210+ queries
    variations = [
        ("When will the exam form close?", "en", "exam_form_deadline"),
        ("Exam portal closing time", "en", "exam_form_deadline"),
        ("परीक्षा फॉर्म की अंतिम तिथि कब समाप्त होगी?", "hi", "exam_form_deadline"),
        ("ફોર્મ જમા કરવાની અંતિમ તારીખ?", "gu", "exam_form_deadline"),
        ("Exam form kab tak bharna hai?", "hinglish", "exam_form_deadline"),
        ("Exam form kyare bandh thase?", "gujlish", "exam_form_deadline"),
        ("When is the Robotics exam?", "en", "exam_timetable"),
        ("रोबोटिक्स परीक्षा की तारीख क्या है?", "hi", "exam_timetable"),
        ("રોબોટિક્સની પરીક્ષા ક્યારે છે?", "gu", "exam_timetable"),
        ("Robotics exam kab hai bhai?", "hinglish", "exam_timetable"),
        ("Robotics pariksha kyare chhe?", "gujlish", "exam_timetable"),
        ("Makar Sankranti holiday date 2024", "en", "holiday_information"),
        ("मकर संक्रांति की छुट्टी किस तारीख को है?", "hi", "holiday_information"),
        ("મકરસંક્રાંતિની રજા કઈ તારીખે છે?", "gu", "holiday_information"),
        ("Makar Sankranti ki chutti kab hai?", "hinglish", "holiday_information"),
        ("Makar Sankranti ni raja kyare chhe?", "gujlish", "holiday_information"),
        ("What is the capital of Japan?", "en", "out_of_scope"),
        ("टोक्यो किस देश की राजधानी है?", "hi", "out_of_scope"),
        ("ઓસ્ટ્રેલિયાની રાજધાની કઈ છે?", "gu", "out_of_scope"),
        ("France ka president kaun hai?", "hinglish", "out_of_scope"),
        ("London kya deshma chhe?", "gujlish", "out_of_scope")
    ]

    while len(dataset) < target_count:
        base = random.choice(variations)
        # Add slight query modifier
        modifier = random.choice(["", " please tell me", " bhai", " jaldi batao", " sir", " details", " info"])
        dataset.append({
            "id": f"q_{id_counter}",
            "query": base[0] + modifier,
            "expected_language": base[1],
            "expected_intent": base[2],
            "gold_source": None
        })
        id_counter += 1

    return dataset

if __name__ == "__main__":
    data = generate_eval_dataset(210)
    out_path = os.path.join(os.path.dirname(__file__), "../../data/evaluation/eval_dataset_210.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(data)} multilingual evaluation queries at {out_path}")
