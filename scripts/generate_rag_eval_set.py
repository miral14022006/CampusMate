import csv
from pathlib import Path

# Load 120 queries from retrieval_set.csv
retrieval_set = Path("eval/retrieval_set.csv")
rows = []
with open(retrieval_set, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for i, r in enumerate(reader):
        if i >= 120:
            break
        rows.append({
            "query_id": f"rag_{i+1:03d}",
            "query": r["query"],
            "language": r["language"],
            "intent": r["intent"],
            "is_answerable": "true",
            "gold_doc": r["gold_doc"],
            "gold_fact": r["gold_chunk_or_text_span"][:100]
        })

# Add 30 unanswerable queries
unanswerable = [
    ("rag_121", "What is the name of the president of the student astronomy society?", "en", "out_of_scope"),
    ("rag_122", "कॉलेज में स्विमिंग पूल की फीस और समय क्या है?", "hi", "out_of_scope"),
    ("rag_123", "કૉલેજ કેમ્પસમાં એટીએમ ક્યાં આવેલું છે?", "gu", "out_of_scope"),
    ("rag_124", "Who won the annual inter-college cricket championship in 2021?", "en", "out_of_scope"),
    ("rag_125", "Campus canteen mein pizza ki price kitni hai?", "hi-Latn", "out_of_scope"),
    ("rag_126", "What is the brand of AC installed in room 204?", "en", "out_of_scope"),
    ("rag_127", "હોસ્ટેલના રૂમમાં કઈ કંપનીના પંખા લગાવેલા છે?", "gu", "out_of_scope"),
    ("rag_128", "Where can I buy second-hand bicycles near campus gate 3?", "en", "out_of_scope"),
    ("rag_129", "कॉलेज के बाहर सबसे अच्छी चाय की दुकान कौन सी है?", "hi", "out_of_scope"),
    ("rag_130", "What is the personal mobile number of Dean of Student Welfare?", "en", "out_of_scope"),
    ("rag_131", "Gym trainer ka monthly salary kitna hai?", "hi-Latn", "out_of_scope"),
    ("rag_132", "કૉલેજના માળી કાકાનું નામ શું છે?", "gu", "out_of_scope"),
    ("rag_133", "Can students bring private pet dogs inside classrooms?", "en", "out_of_scope"),
    ("rag_134", "हॉस्टल में रात 2 बजे पिज़्ज़ा डिलीवरी अलाउड है क्या?", "hi-Latn", "out_of_scope"),
    ("rag_135", "What is the Wi-Fi password for the guest router at auditorium?", "en", "out_of_scope"),
    ("rag_136", "લાઇબ્રેરી માં ગીતા પ્રેસ ની કઈ ચોપડીઓ ઉપલબ્ધ છે?", "gu", "out_of_scope"),
    ("rag_137", "What is the flight ticket allowance for visiting faculty from USA?", "en", "out_of_scope"),
    ("rag_138", "Admission office ke clerk ka birthday kab aata hai?", "hi-Latn", "out_of_scope"),
    ("rag_139", "How many trees were planted during the 2018 plantation drive?", "en", "out_of_scope"),
    ("rag_140", "કૉલેજ બસ ડ્રાઇવરનો ફોન નંબર મળી શકે?", "gu", "out_of_scope"),
    ("rag_141", "Does the college offer scuba diving certification courses?", "en", "out_of_scope"),
    ("rag_142", "कॉलेज ऑडिटोरियम में कौन सा साउंड सिस्टम लगा है?", "hi", "out_of_scope"),
    ("rag_143", "What was the highest score in the college BGMI tournament?", "en", "out_of_scope"),
    ("rag_144", "Hostel ke room 105 mein light bulb kis brand ka hai?", "hi-Latn", "out_of_scope"),
    ("rag_145", "કૉલેજમાં ફ્રી આઇસક્રીમ ક્યારે મળે છે?", "gu", "out_of_scope"),
    ("rag_146", "What is the registration number of college bus number 4?", "en", "out_of_scope"),
    ("rag_147", "Sports ground par ghaas kis machine se kaati jaati hai?", "hi-Latn", "out_of_scope"),
    ("rag_148", "Is there a helipad on top of the engineering block roof?", "en", "out_of_scope"),
    ("rag_149", "કેન્ટીનમાં પાણીપુરી કયા વારે બને છે?", "gu", "out_of_scope"),
    ("rag_150", "Can I submit my semester fee using cryptocurrency like Bitcoin?", "en", "out_of_scope")
]

for q_id, q, lang, intent in unanswerable:
    rows.append({
        "query_id": q_id,
        "query": q,
        "language": lang,
        "intent": intent,
        "is_answerable": "false",
        "gold_doc": "none",
        "gold_fact": "NO_ANSWER"
    })

out_file = Path("eval/rag_set.csv")
with open(out_file, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["query_id", "query", "language", "intent", "is_answerable", "gold_doc", "gold_fact"])
    writer.writeheader()
    writer.writerows(rows)

print(f"Generated {len(rows)} RAG evaluation queries in {out_file}")

