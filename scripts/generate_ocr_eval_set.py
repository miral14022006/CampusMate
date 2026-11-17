import os
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Directory for OCR evaluation dataset
eval_dir = Path("eval/ocr_set")
eval_dir.mkdir(parents=True, exist_ok=True)

test_samples = [
    # 5 English
    ("eng_01", "Examination Form submission deadline for 3rd semester is 25th October 2024.", "en"),
    ("eng_02", "Annual hostel fee is Rs 36000 including electricity, water and campus Wi-Fi access.", "en"),
    ("eng_03", "Central Library remains open from 8:00 AM to 8:00 PM on all working weekdays.", "en"),
    ("eng_04", "Bus pass counter operates between 11:00 AM and 3:00 PM at Student Amenity Center.", "en"),
    ("eng_05", "Minimum 75 percent attendance in lectures and practicals is compulsory to appear in exams.", "en"),

    # 5 Hindi
    ("hin_01", "परीक्षा फॉर्म भरने की अंतिम तिथि 25 अक्टूबर 2024 निर्धारित की गई है।", "hi"),
    ("hin_02", "छात्रावास का वार्षिक शुल्क 36,000 रुपये है जिसमें भोजन और आवास शामिल है।", "hi"),
    ("hin_03", "केंद्रीय पुस्तकालय सभी कार्य दिवसों में प्रातः 8 बजे से सायं 8 बजे तक खुला रहेगा।", "hi"),
    ("hin_04", "पुनर्मूल्यांकन के लिए छात्र परीक्षा परिणाम के 15 दिनों के भीतर आवेदन कर सकते हैं।", "hi"),
    ("hin_05", "सभी विद्यार्थियों को कॉलेज परिसर में पहचान पत्र पहनना अनिवार्य है।", "hi"),

    # 5 Gujarati
    ("guj_01", "પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ 25 ઓક્ટોબર 2024 રાખવામાં આવી છે.", "gu"),
    ("guj_02", "કૉલેજ ફી ઓનલાઇન પોર્ટલ દ્વારા 15 ઓગસ્ટ પહેલાં જમા કરાવવાની રહેશે.", "gu"),
    ("guj_03", "સેન્ટ્રલ લાઇબ્રેરી સોમવાર થી શનિવાર સવારે 8:00 થી રાત્રે 8:00 સુધી ખુલ્લી રહેશે.", "gu"),
    ("guj_04", "બસ પાસ રિન્યુ કરાવવા માટે કાઉન્ટર નંબર 3 પર સંપર્ક કરવો.", "gu"),
    ("guj_05", "દરેક વિદ્યાર્થીએ કૉલેજ કેમ્પસમાં ઓળખકાર્ડ સાથે રાખવું ફરજિયાત છે.", "gu")
]

manifest = []

for sample_id, text, lang in test_samples:
    # Synthesize clean 600x200 grayscale image
    img = Image.new("RGB", (800, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Draw text
    draw.text((20, 80), text, fill=(0, 0, 0))

    img_path = eval_dir / f"{sample_id}.png"
    img.save(img_path)

    manifest.append({
        "sample_id": sample_id,
        "image_file": str(img_path),
        "ground_truth": text,
        "language": lang
    })

manifest_file = eval_dir / "manifest.json"
with open(manifest_file, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"Generated {len(manifest)} OCR test notice images in {eval_dir}")

