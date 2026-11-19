import random

COURSES = ["BTech", "B.Tech", "MTech", "Diploma", "BCA", "MCA"]
BRANCHES = ["Computer Engineering", "Computer Science", "Information Technology", "Civil Engineering", "Mechanical", "Electrical", "CSE", "IT"]
SEMESTERS = ["1st sem", "2nd sem", "3rd sem", "4th sem", "5th sem", "6th sem", "7th sem", "8th sem"]
EXAM_TYPES = ["Mid Sem", "End Sem", "Remedial", "Regular", "Supplementary"]
LOCATIONS = ["administrative block", "student counter", "registrar office", "department notice board", "college portal"]
YEARS = ["2024", "2025", "this academic year", "upcoming winter exam"]

# Prefixes and suffixes for rich student voice diversity
PREFIXES = {
    "en": [
        "Please inform me, ", "Could anyone clarify, ", "I want to ask, ", "Can somebody check, ",
        "Excuse me, ", "Urgent question: ", "Hello admin, ", "Quick doubt: ", "Can you please tell me, ",
        "Kindly update me, ", "Is it confirmed that, ", "Does anyone know, "
    ],
    "hi": [
        "कृपया बताइए, ", "क्या कोई बता सकता है, ", "मुझे जानना है कि, ", "नमस्ते सर, ",
        "एक जरूरी प्रश्न: ", "कृपया स्पष्ट करें, ", "जल्दी बताओ भाई, ", "क्या कोई अपडेट है कि, ",
        "छात्र अनुभाग से निवेदन है, ", "जानकारी दीजिए, "
    ],
    "gu": [
        "મહેરબાની કરીને જણાવો, ", "શું કોઈ કહી શકે છે કે, ", "મારે પૂછવું છે કે, ", "નમસ્તે સર, ",
        "તાત્કાલિક પ્રશ્ન: ", "કોઈ વિગતવાર માહિતી આપો, ", "જલ્દી જણાવો ને, ", "શું કોઈ અપડેટ છે કે, ",
        "વિદ્યાર્થી શાખાને નમ્ર અપીલ, ", "વિગત આપવા વિનંતી, "
    ],
    "hi-Latn": [
        "Bhai please batao na, ", "Yr koi bata do, ", "Urgent doubt tha: ", "Sir please clarify kijiye, ",
        "Kisi ko idea hai kya, ", "Hello admin, ", "Quick question bro: ", "Plz update me: ",
        "College group me koi batayega, ", "Batao na koi please, "
    ],
    "gu-Latn": [
        "Bhai koi batavo ne, ", "Please clarify karo sir, ", "Mane ek doubt che: ", "Kem cho sir, ",
        "Koi ne khabar che ke, ", "Urgent pucho chhu: ", "Hello admin team, ", "Group ma koi kaho ne, ",
        "Plz reply aapjo: ", "Fast update aapo bhai: "
    ]
}

SUFFIXES = {
    "en": [
        " for my branch.", " as soon as possible.", " right now.", " for campus students.",
        " urgently please.", " according to new notice.", " before the deadline.", " please verify.",
        " thanks in advance.", " in detail."
    ],
    "hi": [
        " जल्द से जल्द बताएं।", " कृपया पुष्टि करें।", " नए नोटिस के अनुसार।", " अंतिम तिथि से पहले।",
        " बहुत आभारी रहूँगा।", " तुरंत जवाब दें।", " नियम पुस्तिका के अनुसार।", " धन्यवाद।"
    ],
    "gu": [
        " શક્ય તેટલું જલ્દી જણાવો.", " નવા પરિપત્ર મુજબ.", " છેલ્લી તારીખ પહેલા.", " વિગતવાર માહિતી આપવા નમ્ર વિનંતી.",
        " આપનો આભાર.", " તરત જવાબ આપશો.", " નિયમ મુજબ જણાવો."
    ],
    "hi-Latn": [
        " jaldi bata do bhai.", " plz reply fast.", " urgent hai please.", " new notice ke hisab se.",
        " website par link nahi mil rahi.", " help kardo yr.", " thanks bro.", " deadline se pehle batana."
    ],
    "gu-Latn": [
        " jaldi kaho ne bhai.", " plz fast reply aapjo.", " urgent che kharekhar.", " circular pramane batavo.",
        " link nathi malti portal par.", " madat karo please.", " aabhar bhai.", " date pate e pela kaho."
    ]
}

NOISE_VARIANTS = {
    "kab": ["kb", "kab", "kb tak"],
    "kya": ["kya", "kia"],
    "kyun": ["kyu", "kyun", "kyon"],
    "please": ["plz", "pls", "please"],
    "kaise": ["kese", "kaise", "ks"],
    "kitna": ["ktna", "kitna"],
    "kitni": ["ktni", "kitni"],
    "batao": ["btao", "batao", "bataiye"],
    "chahiye": ["chaiye", "chahiye", "chahye"],
    "admission": ["admn", "admission", "admissn"],
    "semester": ["sem", "semister", "semester"],
    "shu": ["su", "shu"],
    "che": ["che", "chhe"],
    "ketli": ["ktli", "ketli"],
    "kyare": ["kyre", "kyare"],
    "mate": ["mte", "mate"]
}

def inject_noise(text: str) -> str:
    tokens = text.split()
    noisy_tokens = []
    for t in tokens:
        lower = t.lower()
        if lower in NOISE_VARIANTS and random.random() < 0.40:
            replacement = random.choice(NOISE_VARIANTS[lower])
            noisy_tokens.append(replacement)
        else:
            noisy_tokens.append(t)
    return " ".join(noisy_tokens)

