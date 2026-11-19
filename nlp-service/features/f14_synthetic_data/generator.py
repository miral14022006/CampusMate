import random
from typing import List, Dict
from features.f14_synthetic_data.slots import (
    COURSES, BRANCHES, SEMESTERS, EXAM_TYPES, PREFIXES, SUFFIXES, inject_noise
)

INTENT_EXPANSION_TEMPLATES = {
    "exam_form_deadline": {
        "en": [
            "What is the final deadline to submit the {exam_type} examination form for {branch}?",
            "When will the exam registration portal close for {semester} students in {course}?",
            "Is there any late fee for submitting the exam form after the due date in {branch}?",
            "Please confirm the last date for {exam_type} exam form submission in {course}.",
            "Can I submit my {semester} exam registration form with a penalty fee?"
        ],
        "hi": [
            "{branch} के छात्रों के लिए {exam_type} परीक्षा फॉर्म जमा करने की अंतिम तिथि क्या है?",
            "{semester} परीक्षा पंजीकरण पोर्टल किस तारीख को बंद होगा {course} में?",
            "क्या अंतिम तिथि के बाद {course} परीक्षा फॉर्म भरने पर विलंब शुल्क लगेगा?",
            "कृपया {exam_type} परीक्षा फॉर्म जमा करने की अंतिम तारीख बताएं {branch} की।",
            "क्या मैं लेट फीस के साथ {semester} परीक्षा फॉर्म भर सकता हूँ?"
        ],
        "gu": [
            "{branch} ના વિદ્યાર્થીઓ માટે {exam_type} પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ શું છે?",
            "{semester} પરીક્ષા રજીસ્ટ્રેશન પોર્ટલ કઈ તારીખે બંધ થશે {course} માં?",
            "શું છેલ્લી તારીખ પછી {course} પરીક્ષા ફોર્મ ભરવા માટે લેટ ફી લાગશે?",
            "મહેરબાની કરીને {exam_type} પરીક્ષા ફોર્મ જમા કરવાની તારીખ જણાવો {branch} માટે.",
            "લેટ ફી સાથે {semester} નું એક્ઝામ ફોર્મ ક્યાં સુધી ભરી શકાશે?"
        ],
        "hi-Latn": [
            "{branch} {semester} ka {exam_type} exam form bharne ki last date kab hai?",
            "Exam form submit karne ka portal kab close hoga {course} me date batao?",
            "Bhai late fee kitna lagega agar exam form date nikal gayi {branch} me?",
            "Final date batao {semester} exam form submission ki please portal pe.",
            "Kya penalty dekar {exam_type} exam form submit kar sakte hain {course} me?"
        ],
        "gu-Latn": [
            "{branch} ma {semester} na exam form bharvani last date kyare che?",
            "{course} na exam form submission mate portal kyare bandh thase date kaho?",
            "Bhai late fee ketli thase jo exam form date pati jay {branch} ma?",
            "{exam_type} exam form submit karva mate chelli date su chhe {semester} mate?",
            "Penalty sathe {semester} nu exam form kyare submit thay portal par?"
        ]
    },
    "exam_timetable": {
        "en": [
            "Where can I find the official exam timetable for {branch} {semester}?",
            "When will the schedule for {exam_type} exams be published on the {course} portal?",
            "Has the datesheet for {course} {semester} been announced yet by the college?",
            "Please share the timetable for upcoming {exam_type} examinations in {branch}.",
            "Are there any changes in the examination dates for {semester} {branch}?"
        ],
        "hi": [
            "{branch} {semester} के लिए परीक्षा समय सारणी कहाँ से डाउनलोड करें?",
            "{course} के लिए {exam_type} परीक्षा का शेड्यूल पोर्टल पर कब जारी होगा?",
            "क्या {semester} की परीक्षा की तारीखों की घोषणा हो चुकी है {branch} में?",
            "कृपया आगामी {exam_type} परीक्षाओं की डेटशीट प्रदान करें {course} विभाग की।",
            "क्या {branch} की परीक्षा तिथियों में कोई बदलाव किया गया है इस बार?"
        ],
        "gu": [
            "{branch} {semester} માટે પરીક્ષાનું ટાઈમ ટેબલ ક્યાંથી મળશે પોર્ટલ પર?",
            "{course} માટે {exam_type} પરીક્ષાનું શિડ્યુલ ક્યારે જાહેર થશે વેબસાઈટ પર?",
            "શું {semester} ની પરીક્ષા તારીખો જાહેર થઈ ગઈ છે {branch} માં?",
            "આગામી {exam_type} પરીક્ષાઓની તારીખો જણાવો {course} માટે.",
            "શું {branch} ની પરીક્ષાની તારીખોમાં કોઈ ફેરફાર છે સેમેસ્ટર {semester} માં?"
        ],
        "hi-Latn": [
            "{branch} {semester} ka exam timetable kab aayega website pe date sheet?",
            "{exam_type} exam schedule kaha se download kare {course} ka direct link?",
            "Bhai timetable declare ho gaya kya {semester} ka datesheet dekhna hai {branch} ka.",
            "Exam schedule check karne ki direct portal link bhej do please {course} ki.",
            "{branch} ke paper kab se start ho rahe hain timetable me bataiye?"
        ],
        "gu-Latn": [
            "{branch} {semester} no exam timetable kyare aavshe portal par date sheet?",
            "{exam_type} exam no schedule kyathi download karvano che {course} mate?",
            "Bhai datesheet aavi gai ke baki che {semester} {branch} mate?",
            "Exam timetable check karva mate link kyathi malse {course} ni?",
            "{branch} na paper kyare sharu thay che date su chhe timetable ma?"
        ]
    },
    "fee_payment": {
        "en": [
            "What are the online payment modes for paying {course} tuition fees?",
            "Can I pay my {semester} fee using UPI or NetBanking on the college portal?",
            "Where do I generate the fee payment receipt after successful transaction in {branch}?",
            "What should I do if money was debited but the fee status is not updated in {course}?",
            "Is there an offline counter for fee submission at the college campus for {branch}?"
        ],
        "hi": [
            "{course} ट्यूशन फीस ऑनलाइन जमा करने के कौन से तरीके उपलब्ध हैं?",
            "क्या मैं ईआरपी पोर्टल पर यूपीआई या नेटबैंकिंग से {semester} फीस भर सकता हूँ?",
            "सफल भुगतान के बाद कॉलेज फीस की रसीद कहाँ से डाउनलोड करें {branch} के लिए?",
            "यदि खाते से पैसे कट गए लेकिन फीस अपडेट नहीं हुई {course} में तो क्या करें?",
            "क्या कॉलेज में फीस जमा करने का ऑफलाइन काउंटर खुला है {branch} के लिए?"
        ],
        "gu": [
            "{course} ટ્યુશન ફી ઓનલાઇન ભરવા માટે કયા વિકલ્પો છે પોર્ટલ પર?",
            "શું પોર્ટલ પર UPI કે નેટબેન્કિંગ દ્વારા {semester} ની ફી ભરી શકાય છે?",
            "ફી ભર્યા પછી ઓનલાઇન રસીદ ક્યાંથી ડાઉનલોડ કરવી {branch} માટે?",
            "જો ખાતામાંથી પૈસા કપાઈ ગયા હોય પણ ફી સ્ટેટસ અપડેટ ન થાય {course} માં તો શું કરવું?",
            "કોલેજમાં રૂબરૂ ફી જમા કરાવવા માટે કાઉન્ટર છે કે નહીં {branch} માટે?"
        ],
        "hi-Latn": [
            "{course} ki college fee online pay kaise karni hai portal se netbanking se?",
            "UPI ya NetBanking se fee payment accept hota hai kya {semester} ke liye?",
            "Payment ho gaya par receipt download nahi ho rahi {branch} me kaha contact kare?",
            "Fee debited show kar raha hai par portal par pending hai {course} me kya karu?",
            "Challan ke through bank me offline fees bhar sakte hain kya {branch} me?"
        ],
        "gu-Latn": [
            "{course} ni college fees online kevi rite bharvani chhe UPI thi?",
            "UPI thi fees pay kari shakay ke NetBanking j jaroori che {semester} mate?",
            "Fees payment ni receipt kyathi print thase batavo {branch} mate?",
            "Account mathi paisa kapai gaya che pan fee pending batave che {course} ma?",
            "Offline counter par rokde thi fees bharva jashu toh chalashe {branch} ma?"
        ]
    },
    "fee_structure": {
        "en": [
            "What is the total annual fee for {branch} in {course} program?",
            "How much is the tuition fee and laboratory fee per semester for {branch}?",
            "Can you break down the tuition, library and development charges for {course}?",
            "Are there any additional examination fees included in the fee structure of {course}?",
            "What is the total expenditure per year for {course} students in {branch}?"
        ],
        "hi": [
            "{course} में {branch} के लिए कुल वार्षिक फीस कितनी है विवरण दें?",
            "प्रति सेमेस्टर ट्यूशन फीस और प्रयोगशाला शुल्क कितना है {branch} के लिए?",
            "क्या आप कॉलेज डेवलपमेंट और लाइब्रेरी शुल्क का विवरण दे सकते हैं {course} में?",
            "क्या फीस संरचना में परीक्षा शुल्क भी शामिल है {branch} छात्रों के लिए?",
            "{course} के लिए प्रति वर्ष कुल कितना खर्च आता है {branch} में?"
        ],
        "gu": [
            "{course} માં {branch} માટે કુલ વાર્ષિક ફી કેટલી થાય વિગત આપો?",
            "સેમેસ્ટર દીઠ ટ્યુશન ફી અને લેબોરેટરી ચાર્જ કેટલો છે {branch} માટે?",
            "લાઈબ્રેરી અને કોલેજ ડેવલપમેન્ટ ફીની વિગત આપો {course} માં.",
            "શું ફી સ્ટ્રક્ચરમાં પરીક્ષા ફી પણ સામેલ છે {branch} માટે?",
            "{course} માટે આખા વર્ષનો કુલ ખર્ચ કેટલો થાય છે {branch} માં?"
        ],
        "hi-Latn": [
            "{course} me {branch} ki saal ki total fees kitni lagti hai complete detail?",
            "Per sem tuition fee aur lab charges kitne hote hain {branch} department me?",
            "Fee structure ka complete bifurcation mil sakta hai kya {course} ke liye?",
            "Kya exam fee alag se deni padti hai ya tuition me included hai {branch} me?",
            "{course} complete karne me total kitna kharcha aayega {branch} student ka?"
        ],
        "gu-Latn": [
            "{course} ma {branch} mate aakha varas ni fee ketli lage chhe detail aapo?",
            "Semester wise tuition fee ane lab charge ketlo thase {branch} ma?",
            "Fee structure no detail circular kyathi download karvo {course} mate?",
            "Exam fee alag thi bharvani ke college fee ma aavi jay {branch} ma?",
            "{course} no total kharcho ketlo thay saal no {branch} student mate?"
        ]
    },
    "scholarship": {
        "en": [
            "How can eligible students apply for MYSY and Digital Gujarat scholarships in {course}?",
            "What are the income criteria and documents needed for government scholarships in {branch}?",
            "Where should I submit the scholarship sanction letter in college for {course}?",
            "Can reserved category students avail tuition fee waivers in {branch}?",
            "When will scholarship amounts be disbursed to student bank accounts for {course}?"
        ],
        "hi": [
            "पात्र छात्र एमवायएसवाय और डिजिटल गुजरात स्कॉलरशिप के लिए कैसे आवेदन करें {course} में?",
            "सरकारी छात्रवृत्ति के लिए आय प्रमाण पत्र और कौन से दस्तावेज आवश्यक हैं {branch} के लिए?",
            "कॉलेज में स्कॉलरशिप स्वीकृति पत्र किस काउंटर पर जमा करना होगा {course} में?",
            "क्या आरक्षित श्रेणी के छात्रों को ट्यूशन फीस में छूट मिलती है {branch} में?",
            "छात्रवृत्ति की राशि बैंक खाते में कब तक जमा की जाएगी {course} के छात्रों को?"
        ],
        "gu": [
            "વિદ્યાર્થીઓ MYSY અને ડિજિટલ ગુજરાત સ્કોલરશિપ માટે કેવી રીતે અરજી કરી શકે {course} માં?",
            "સરકારી સ્કોલરશિપ માટે આવક મર્યાદા અને કયા ડોક્યુમેન્ટ્સ જોઈએ {branch} માટે?",
            "કોલેજમાં સ્કોલરશિપનું મંજૂરી પત્રક કઈ શાખામાં જમા કરાવવું {course} માટે?",
            "શું અનામત વર્ગના વિદ્યાર્થીઓને ટ્યુશન ફી માફી મળે છે {branch} માં?",
            "સ્કોલરશિપની રકમ બેંક ખાતામાં ક્યારે જમા થશે {course} ના વિદ્યાર્થીઓને?"
        ],
        "hi-Latn": [
            "MYSY scholarship ka form kaise bhare portal par steps batao {course} ke liye?",
            "Digital Gujarat scholarship ke liye income certificate kitne ka chahiye {branch} me?",
            "College accounts section me scholarship ke documents kab jama karne hain {course} ke?",
            "OBC aur SC/ST students ke liye fees concession kaise milta hai {branch} me?",
            "Scholarship ka paisa account me kab tak credit hoga {course} students ka?"
        ],
        "gu-Latn": [
            "Digital Gujarat scholarship form bharva mate shu document joyiye {course} ma?",
            "MYSY scholarship mate income limit ketli hovi joyiye {branch} mate?",
            "College ma scholarship na kagaliyo kya jama karavana che {course} ma?",
            "Reserved category mate fee ma discount ke mafi male ke nahi {branch} ma?",
            "Scholarship no hapto bank account ma kyare aavshe date su chhe {course} mate?"
        ]
    },
    "hostel": {
        "en": [
            "What is the procedure for booking a hostel room on campus for {course} students?",
            "How much is the annual hostel accommodation and mess fee for {branch} students?",
            "What is the gate closing curfew time for the boys and girls hostel on campus?",
            "Are laundry, hot water, and Wi-Fi facilities provided in the college hostel?",
            "Who should I contact to request room reallocation or maintenance in the hostel?"
        ],
        "hi": [
            "कैंपस में हॉस्टल रूम बुक करने की प्रक्रिया क्या है {course} छात्रों के लिए?",
            "वार्षिक छात्रावास शुल्क और मासिक मेस का खर्च कितना है कॉलेज में?",
            "छात्र और छात्रा छात्रावास के लिए गेट बंद होने का समय क्या है रात में?",
            "क्या हॉस्टल में वाई-फाई, गर्म पानी और लॉन्ड्री की सुविधा उपलब्ध है छात्रों को?",
            "कमरा बदलने या मेंटेनेंस के लिए किससे संपर्क करना चाहिए हॉस्टल में?"
        ],
        "gu": [
            "કેમ્પસ હોસ્ટેલમાં રૂમ બુકિંગ કરવા માટે શું પ્રોસિજર છે {course} માટે?",
            "હોસ્ટેલનો વાર્ષિક ચાર્જ અને મેસની ફી કેટલી છે કોલેજ કેમ્પસમાં?",
            "બોય્ઝ અને ગર્લ્સ હોસ્ટેલ માટે રાત્રે ગેટ બંધ થવાનો સમય શું છે નિયમ મુજબ?",
            "શું હોસ્ટેલમાં ગરમ પાણી અને Wi-Fi ની સુવિધા મળે છે વિદ્યાર્થીઓને?",
            "રૂમ બદલવા અથવા મેન્ટેનન્સ માટે કોને અરજી આપવી હોસ્ટેલ વોર્ડનને?"
        ],
        "hi-Latn": [
            "Hostel room allotment kaise hota hai aur form kaha milega {course} ke liye?",
            "Mess ka monthly charge kitna lagta hai aur khana kaisa hota hai campus hostel me?",
            "Hostel in-time aur gate closing curfew time kya hai night me boys hostel ka?",
            "Wi-Fi aur electricity charges hostel fee me included hote hain kya bataiye?",
            "Hostel warden ka contact number aur office kaha par hai campus me?"
        ],
        "gu-Latn": [
            "Hostel ma room book karva mate shu document joyiye {course} student ne?",
            "Hostel ni aakha varas ni fees ketli chhe ane mess facility che campus ma?",
            "Hostel no gate ratre ketla vagye bandh thay che curfew time su chhe boys mate?",
            "Hostel ma Wi-Fi ane garam pani malse ke alag charge che dar mahine?",
            "Warden sir no number malse hostel room transfer mate please?"
        ]
    },
    "library_timings": {
        "en": [
            "What are the operating hours for the central college library for {course}?",
            "Is the reading hall open late at night during semester exams for {branch}?",
            "How many books can a {course} student borrow simultaneously with an ID card?",
            "What is the fine per day for overdue library books in the reading department?",
            "Is the library accessible on Sundays and public holidays for study?"
        ],
        "hi": [
            "सेंट्रल लाइब्रेरी के खुलने और बंद होने का समय क्या है {course} के लिए?",
            "क्या परीक्षा के दिनों में रीडिंग रूम रात देर तक खुला रहता है {branch} में?",
            "एक {course} छात्र एक बार में कितनी पुस्तकें जारी करा सकता है लाइब्रेरी से?",
            "पुस्तक देर से लौटाने पर प्रतिदिन कितना विलंब शुल्क लगता है पुस्तकालय में?",
            "क्या रविवार और सार्वजनिक अवकाश के दिन लाइब्रेरी खुली रहती है पढ़ाई के लिए?"
        ],
        "gu": [
            "સેન્ટ્રલ લાઈબ્રેરીનો સમય શું છે અને ક્યારે ખુલે છે {course} માટે?",
            "પરીક્ષા દરમિયાન રીડિંગ હોલ રાત્રે કેટલા વાગ્યા સુધી ખુલ્લો રહે છે {branch} માં?",
            "{course} ના વિદ્યાર્થી એકસાથે કેટલી ચોપડીઓ ઈશ્યુ કરાવી શકે કાર્ડ પર?",
            "પુસ્તક મોડું જમા કરાવવા પર દિવસ દીઠ કેટલો દંડ થાય છે લાઈબ્રેરીમાં?",
            "શું રવિવારે કે રજાના દિવસે લાઈબ્રેરી ખુલ્લી હોય છે વાંચવા માટે?"
        ],
        "hi-Latn": [
            "Central library kitne baje open hoti hai aur closing time kya hai {course} ke liye?",
            "Exam ke time reading room late night tak khula rehta hai kya {branch} me?",
            "Ek time me student section se kitni books issue ho sakti hain library card par?",
            "Late book return karne par per day kitna fine lagta hai central library me?",
            "Sunday ko college library me padhne ja sakte hain kya books issue karne?"
        ],
        "gu-Latn": [
            "Library no time shu che ane books kevi rite issue thay {course} mate?",
            "Exam time ma reading room ratre ketla vagya sudhi chalu hoy che {branch} ma?",
            "Ek sathe ketla pustako issue karavi shakay library card par student mate?",
            "Pustak late submit karva par ketlo fine lage chhe per day library ma?",
            "Sunday na divase library open hoy che ke bandh rehti hoy che?"
        ]
    },
    "result": {
        "en": [
            "When will the examination results for {course} {semester} {branch} be declared?",
            "Where can I check my university grade card and GPA online for {course}?",
            "What should I do if my subject marks appear withheld or absent in the result of {branch}?",
            "How can I obtain an official signed transcript or grade sheet for {semester}?",
            "Are {exam_type} exam results declared on the student portal for {branch}?"
        ],
        "hi": [
            "{course} {semester} का परीक्षा परिणाम कब तक घोषित होगा {branch} शाखा का?",
            "ऑनलाइन ग्रेड कार्ड और जीपीए चेक करने के लिए आधिकारिक लिंक क्या है {course} में?",
            "यदि परिणाम में अंक अनुपस्थित या रोके हुए दिखाई दें तो क्या करें {branch} में?",
            "हस्ताक्षरित मूल मार्कशीट कॉलेज से कब प्राप्त होगी {semester} की?",
            "क्या {exam_type} परीक्षा का परिणाम घोषित हो चुका है {branch} के लिए?"
        ],
        "gu": [
            "{course} {semester} નું પરિણામ કઈ તારીખે જાહેર થશે {branch} શાખાનું?",
            "ઓનલાઇન ગ્રેડ કાર્ડ અને માર્કશીટ ક્યાંથી ચેક કરવી {course} પોર્ટલ પર?",
            "જો રિઝલ્ટમાં ગેરહાજર કે વિથહેલ્ડ દર્શાવે તો શું કરવું {branch} માં?",
            "ઓફિશિયલ માર્કશીટ કોલેજમાંથી ક્યારે મળશે {semester} ના વિદ્યાર્થીઓને?",
            "શું {exam_type} પરીક્ષાનું પરિણામ આવી ગયું છે {branch} નું વેબસાઈટ પર?"
        ],
        "hi-Latn": [
            "{course} {semester} ka exam result kab aayega website par {branch} ka?",
            "Result check karne ki portal link bhej do roll number dal kar dekhna hai {course} ka.",
            "Marksheet me Absent show kar raha hai paper diya tha {branch} me kya karu?",
            "Original marksheet college student section me kab aayegi lene {semester} ki?",
            "Grade card kab tak generate hoga portal pe {branch} ke {semester} ka?"
        ],
        "gu-Latn": [
            "{course} {semester} nu result kyare aavshe ane mark sheet kyathi malse {branch} ni?",
            "Online result jova mate roll number kya enter karvano {course} portal par?",
            "Result ma Absent lakhelu aave che pan paper aapyu hatu {branch} ma shu karvu?",
            "Hard copy mark sheet student section mathi kyare malse {semester} mate?",
            "Grade card download karvani link aapo {branch} na {semester} mate."
        ]
    },
    "re_evaluation": {
        "en": [
            "What is the application procedure for answer paper re-evaluation in {course} {branch}?",
            "How much is the re-checking fee per subject in {course} for {semester}?",
            "Within how many days of result declaration can I apply for reassessment in {branch}?",
            "Will I receive a copy of my evaluated answer script upon request in {course}?",
            "Where do I submit the re-checking application form for {exam_type} exam?"
        ],
        "hi": [
            "उत्तर पुस्तिका के पुनर्मूल्यांकन या री-चेकिंग के लिए आवेदन कैसे करें {course} {branch} में?",
            "{course} में प्रति विषय री-चेकिंग शुल्क कितना निर्धारित है {semester} के लिए?",
            "रिजल्ट आने के कितने दिनों के भीतर पुनर्मूल्यांकन का फॉर्म भरना होता है {branch} में?",
            "क्या आवेदन करने पर जांची हुई उत्तर पुस्तिका की प्रति प्राप्त होगी {course} में?",
            "री-चेकिंग का फॉर्म किस काउंटर पर जमा करना होगा {exam_type} परीक्षा के लिए?"
        ],
        "gu": [
            "ઉત્તરવહીના પુનઃમૂલ્યાંકન અથવા રી-ચેકિંગ માટે કેવી રીતે અરજી કરવી {course} {branch} માં?",
            "{course} માં સબ્જેક્ટ દીઠ રી-ચેકિંગ ફી કેટલી ભરવી પડે છે {semester} માટે?",
            "પરિણામ આવ્યાના કેટલા દિવસોમાં રી-ચેકિંગ ફોર્મ ભરવું પડે {branch} શાખામાં?",
            "શું પેપરની કોપી જોવા માટે અરજી કરી શકાય છે {course} ની પરીક્ષામાં?",
            "રી-ચેકિંગ ફોર્મ કઈ બારી પર જમા કરાવવાનું રહેશે {exam_type} પરીક્ષા માટે?"
        ],
        "hi-Latn": [
            "Paper re-evaluation ya rechecking ke liye form kaise bhare online {course} {branch} me?",
            "Rechecking ki per subject fee kitni lagti hai portal par {semester} ke liye?",
            "Result aane ke kitne din ke andar re-assessment apply karna hota hai {branch} me?",
            "Answer sheet ki photocopy dekhne ke liye alag se form bharna padta hai kya {course} me?",
            "Re-evaluation ka result aane me kitna time lagta hai {exam_type} exam ka?"
        ],
        "gu-Latn": [
            "Exam paper re-checking mate shu karvu pade ane fee ketli che {course} {branch} ma?",
            "Re-checking ma subject wise ketli fee bharvi padse {semester} mate?",
            "Result aavya pachi ketla divasma re-evaluation form bharvanu hoy {branch} ma?",
            "Answer sheet ni copy jova male ke nahi application karva thi {course} ma?",
            "Paper rechecking nu form kyare aapse portal par {exam_type} exam mate?"
        ]
    },
    "attendance_rules": {
        "en": [
            "What is the minimum mandatory attendance percentage required for {course} {branch}?",
            "Is 75% attendance strictly compulsory for getting hall tickets in {semester}?",
            "What medical documents are accepted for condonation of low attendance in {course}?",
            "Will I be detained from {exam_type} exams if attendance falls below 70% in {branch}?",
            "How can I track my cumulative subject-wise attendance online for {semester}?"
        ],
        "hi": [
            "परीक्षा में बैठने के लिए न्यूनतम अनिवार्य उपस्थिति प्रतिशत क्या है {course} {branch} में?",
            "क्या {course} में हॉल टिकट पाने के लिए 75% उपस्थिति आवश्यक है {semester} में?",
            "कम उपस्थिति होने पर कौन सा मेडिकल प्रमाण पत्र मान्य होता है {course} के लिए?",
            "यदि मेरी उपस्थिति 70% से कम है तो क्या मुझे परीक्षा से रोका जाएगा {branch} में?",
            "विद्यार्थी अपनी विषयवार उपस्थिति ऑनलाइन कैसे देख सकते हैं {semester} के लिए?"
        ],
        "gu": [
            "પરીક્ષા આપવા માટે ઓછામાં ઓછી કેટલી હાજરી જરૂરી છે {course} {branch} માં?",
            "શું {course} માં હોલ ટિકિટ મેળવવા માટે 75% હાજરી ફરજિયાત છે {semester} માં?",
            "ઓછી હાજરી હોય તો મેડિકલ સર્ટિફિકેટ માન્ય ગણાય કે નહીં {course} માં?",
            "જો હાજરી 70% કરતા ઓછી હોય તો શું પરીક્ષામાં બેસવા નહીં દે {branch} માં?",
            "વિષયવાર હાજરી ઓનલાઇન પોર્ટલ પર કેવી રીતે ચેક કરવી {semester} માટે?"
        ],
        "hi-Latn": [
            "Exam me baithne ke liye kitna attendance percentage minimum chahiye {course} {branch} me?",
            "Kya 75 percent attendance compulsory hai hall ticket lene ke liye {semester} me?",
            "Medical certificate lagane se attendance shortage cover ho sakti hai kya {course} me?",
            "Attendance kam hone par detain kar dete hain kya {branch} me {semester} me?",
            "ERP portal par daily attendance kaise check kare {branch} student?"
        ],
        "gu-Latn": [
            "Exam aapva mate ketla percent attendance jaroori chhe {course} {branch} ma?",
            "College ma 75 percent hajri mandatory che ke nahi {semester} student mate?",
            "Medical certificate submit kariye toh hajri count thase ke nahi {course} ma?",
            "Attendance ochi hoy toh detain karse exam mathi {branch} ma?",
            "Student portal par subject wise hajri kevi rite jovay {semester} mate?"
        ]
    },
    "bonafide_certificate": {
        "en": [
            "How do I apply for a bonafide student certificate for an ST bus pass in {course}?",
            "What documents are required to obtain a bonafide letter for education loan in {branch}?",
            "How long does it take for the student section to issue a bonafide certificate for {semester}?",
            "Can I request a bonafide certificate online through the college portal for {course}?",
            "Where is the application form for character and bonafide certificate available in {branch}?"
        ],
        "hi": [
            "बस पास और छात्र रियायत के लिए बोनाफाइड सर्टिफिकेट कैसे बनवाएं {course} में?",
            "बैंक लोन के लिए बोनाफाइड लेटर प्राप्त करने हेतु कौन से कागजात चाहिए {branch} के लिए?",
            "छात्र अनुभाग से बोनाफाइड सर्टिफिकेट मिलने में कितना समय लगता है {semester} के छात्रों को?",
            "क्या कॉलेज पोर्टल से ऑनलाइन बोनाफाइड का आवेदन किया जा सकता है {course} में?",
            "बोनाफाइड सर्टिफिकेट का फॉर्म किस विंडो पर उपलब्ध है {branch} विभाग के लिए?"
        ],
        "gu": [
            "એસટી બસ પાસ માટે બોનાફાઇડ સર્ટિફિકેટ મેળવવા શું કરવું {course} માં?",
            "બેંક લોન માટે બોનાફાઇડ લેટર કઢાવવા કયા ડોક્યુમેન્ટ્સ આપવા પડે {branch} માટે?",
            "બોનાફાઇડ સર્ટિફિકેટ ઇશ્યુ થવામાં કેટલા દિવસ લાગે છે {semester} ના વિદ્યાર્થીઓને?",
            "શું પોર્ટલ પરથી ઓનલાઇન બોનાફાઇડ અરજી કરી શકાય {course} માં?",
            "બોનાફાઇડ સર્ટિફિકેટનું ફોર્મ ક્યાંથી મળશે {branch} વિભાગ માટે?"
        ],
        "hi-Latn": [
            "Bus pass ke liye bonafide certificate kaise banwaye college se {course} me?",
            "Education loan ke liye bonafide letter issue karwane ka process kya hai {branch} me?",
            "Application submit karne ke baad bonafide kitne din me mil jata hai {semester} ka?",
            "Student section counter pe bonafide form kab submit hota hai {course} me?",
            "Kya bonafide certificate online download ho sakta hai portal se {branch} ke liye?"
        ],
        "gu-Latn": [
            "Bonafide certificate kadvava mate kya javu pade student section ma {course} mate?",
            "Bus pass mate bonafide kyathi malse form sathe shu jodvu pade {branch} ma?",
            "Bank education loan mate bonafide certificate ketla divasma malse {semester} mate?",
            "College portal par bonafide mate online apply thay ke offline j javu pade {course} ma?",
            "Bonafide letter par Principal na sign karvava mate kyare javu {branch} student ne?"
        ]
    },
    "placement": {
        "en": [
            "What was the highest and average salary package offered in {branch} campus placements?",
            "Which major tech and core engineering companies visit for placement drives in {course}?",
            "What are the minimum CGPA and backlog criteria to be eligible for placements in {branch}?",
            "Does the training and placement cell conduct mock interviews and aptitude tests for {semester}?",
            "When do on-campus recruitment drives commence for final year students in {course}?"
        ],
        "hi": [
            "{branch} के लिए कॉलेज में उच्चतम और औसत प्लेसमेंट पैकेज कितना रहा पिछले साल?",
            "कैंपस प्लेसमेंट ड्राइव के लिए कौन-कौन सी प्रमुख कंपनियां आती हैं {course} में?",
            "प्लेसमेंट में बैठने के लिए न्यूनतम सीजीपीए और बैकलॉग की क्या शर्तें हैं {branch} में?",
            "क्या प्लेसमेंट सेल छात्रों के लिए मॉक इंटरव्यू और एप्टीट्यूड ट्रेनिंग कराता है {course} में?",
            "अंतिम वर्ष के छात्रों के लिए ऑन-कैंपस प्लेसमेंट कब से शुरू होता है {branch} में?"
        ],
        "gu": [
            "{branch} માં કેમ્પસ પ્લેસમેન્ટમાં હાઈએસ્ટ અને એવરેજ પેકેજ કેટલું મળ્યું ગયા વર્ષે?",
            "રિક્રુટમેન્ટ માટે કઈ જાણીતી કંપનીઓ કેમ્પસમાં આવે છે {course} માટે?",
            "પ્લેસમેન્ટમાં બેસવા માટે ઓછામાં ઓછા કેટલા CGPA જોઈએ {branch} માં?",
            "શું ટ્રેનિંગ એન્ડ પ્લેસમેન્ટ સેલ દ્વારા મોક ઇન્ટરવ્યુ લેવામાં આવે છે {course} માં?",
            "છેલ્લા વર્ષના વિદ્યાર્થીઓ માટે પ્લેસમેન્ટ ડ્રાઇવ ક્યારે શરૂ થશે {branch} માં?"
        ],
        "hi-Latn": [
            "{branch} me average aur highest placement package kitna gaya tha last year {course} me?",
            "Campus recruitment me konsi badi companies visit karti hain hire karne {branch} se?",
            "Placement me eligible hone ke liye kitna CGPA maintain karna padta hai {course} me?",
            "Kya active backlogs hone par company test me baithne dete hain {branch} me?",
            "T&P cell me registration kaise karna hai placement drive ke liye {course} student ko?"
        ],
        "gu-Latn": [
            "Placement ma ketlu highest package aavyu hatu last year {branch} ma {course} mate?",
            "Campus placement mate kai kai companies aavshe recruitment ma {branch} ma?",
            "Company na interview ma besva mate ketla CGPA compulsory che {course} ma?",
            "T&P cell ma register kevi rite karvanu placement drive mate {branch} student ne?",
            "Average salary package ketlu male che fresher engineer ne {course} {branch} ma?"
        ]
    },
    "holidays": {
        "en": [
            "When does the annual Diwali vacation start according to the academic calendar in {course}?",
            "Where can I view the list of gazetted college holidays for this semester in {branch}?",
            "Is the college closed on national public holidays and festival dates for {course}?",
            "How many weeks of summer or winter vacation are allotted in {course} academic year?",
            "Will classes be suspended during upcoming cultural festival days in {branch}?"
        ],
        "hi": [
            "शैक्षणिक कैलेंडर के अनुसार वार्षिक दीवाली की छुट्टियाँ कब से शुरू होंगी {course} में?",
            "इस सेमेस्टर के लिए कॉलेज की आधिकारिक छुट्टियों की सूची कहाँ देख सकते हैं {branch} में?",
            "क्या राष्ट्रीय अवकाश और त्योहारों पर कॉलेज पूरी तरह बंद रहता है {course} के लिए?",
            "{course} में छात्रों को कितने सप्ताह का शीतकालीन अवकाश मिलता है कैलेंडर में?",
            "क्या आगामी सांस्कृतिक उत्सव के दौरान कक्षाएं स्थगित रहेंगी {branch} में?"
        ],
        "gu": [
            "એકેડેમિક કેલેન્ડર મુજબ દિવાળી વેકેશન કઈ તારીખથી શરૂ થશે {course} માં?",
            "આ સેમેસ્ટરની જાહેર રજાઓની યાદી ક્યાંથી જોવા મળશે {branch} માટે?",
            "શું તહેવારો અને સરકારી રજાઓના દિવસે કોલેજ બંધ રહે છે {course} માં?",
            "{course} માં વિદ્યાર્થીઓને કેટલા અઠવાડિયાનું વેકેશન મળે છે કેલેન્ડર મુજબ?",
            "શું સાંસ્કૃતિક ફેસ્ટિવલ દરમિયાન લેક્ચર ચાલુ રહેશે કે રજા રહેશે {branch} માં?"
        ],
        "hi-Latn": [
            "Diwali vacation kab se start hoga holiday list me date kya hai {course} me?",
            "College holidays ki official circular list kaha se download kare {branch} ke liye?",
            "Is semester me total kitni declared holidays aane wali hain {course} calendar me?",
            "Vacation ke baad regular classes kis date se resume hongi {branch} me?",
            "Kya Saturday ko college me chhutti hoti hai ya half-day {course} me?"
        ],
        "gu-Latn": [
            "College ma Diwali vacation kyare sharu thay che dates su chhe {course} ma?",
            "Aa semester ni total holidays ketli che ane list kyathi malse {branch} mate?",
            "Tyahevar ni chuttiyo ma college bandh hoy che ke office chalu hoy {course} ma?",
            "Vacation pachi classes kyare sharu thase portal par circular aavyu {branch} mate?",
            "Public holiday ni list academic calendar mathi kevi rite jovay {course} ma?"
        ]
    },
    "bus_transport": {
        "en": [
            "What are the college bus routes, pickup points, and morning timings for {course}?",
            "How do I apply for and renew a semester bus transportation pass for {branch}?",
            "What is the annual bus fee for students commuting from nearby cities for {course}?",
            "Who is the transport supervisor to contact in case of bus delay or breakdown?",
            "Can I change my bus stop location during the middle of the semester for {branch}?"
        ],
        "hi": [
            "कॉलेज बस के रूट्स, स्टॉप और सुबह का समय क्या है {course} छात्रों के लिए?",
            "सेमेस्टर बस पास बनवाने या रिन्यू कराने की क्या प्रक्रिया है {branch} में?",
            "शहर से आने वाले छात्रों के लिए वार्षिक बस परिवहन शुल्क कितना है {course} में?",
            "बस में देरी या खराबी होने पर किस ट्रांसपोर्ट अधिकारी से संपर्क करें कॉलेज में?",
            "क्या सेमेस्टर के बीच में अपना बस स्टॉप बदला जा सकता है {branch} छात्रों द्वारा?"
        ],
        "gu": [
            "કોલેજ બસ કયા રૂટ પર ચાલે છે અને સવારે ઉપડવાનો સમય શું છે {course} માટે?",
            "સેમેસ્ટર બસ પાસ કઢાવવા અથવા રિન્યુ કરાવવા માટે શું પ્રોસેસ છે {branch} માટે?",
            "વિદ્યાર્થીઓ માટે વાર્ષિક બસ ટ્રાન્સપોર્ટ ફી કેટલી છે {course} માં?",
            "બસ લેટ થાય તો કોન્ટેક્ટ કરવા માટે ટ્રાન્સપોર્ટ ઇન્ચાર્જનો નંબર શું છે કોલેજમાં?",
            "શું સેમેસ્ટર ચાલુ હોય ત્યારે બસ સ્ટોપ બદલી શકાય છે {branch} માટે?"
        ],
        "hi-Latn": [
            "College bus ke routes aur pickup points ki list kaha milegi {course} ke liye?",
            "Bus pass renew karwane ke liye kitna fee lagta hai per semester {branch} me?",
            "Subah bus stop par kitne baje aati hai timing schedule batao {course} route ka.",
            "Bus pass banwane ke liye form transport office me kab jama kare {branch} student?",
            "Agar bus miss ho jaye toh college aane ke liye alternative route kya hai {course} me?"
        ],
        "gu-Latn": [
            "College bus na routes ane timings ketla vagye che {course} students mate?",
            "Bus pass banvava mate fee ketli chhe ane form kyathi malse {branch} ma?",
            "Transport office kya aavelu che bus pass renew karva mate {course} ma?",
            "Bus stop change karvu hoy toh application kya aapvani {branch} student ne?",
            "Bus delay thay toh inquiry karva mate coordinator no number aapo {course} mate."
        ]
    },
    "admission": {
        "en": [
            "What is the eligibility criteria and cutoff rank for {course} in {branch}?",
            "What documents must be submitted during ACPC admission counselling for {course}?",
            "What is the management quota admission process and fee structure in {branch}?",
            "Can students from outside the home state apply for {course} admissions in {branch}?",
            "When will the merit list for direct second year engineering be released for {course}?"
        ],
        "hi": [
            "{course} {branch} में प्रवेश के लिए पात्रता और कटऑफ रैंक क्या है इस वर्ष?",
            "एसीपीसी काउंसलिंग के समय कौन-कौन से मूल दस्तावेज प्रस्तुत करने होंगे {course} में?",
            "मैनेजमेंट कोटा में प्रवेश की क्या प्रक्रिया और फीस है {branch} के लिए?",
            "क्या अन्य राज्यों के छात्र भी {course} में प्रवेश ले सकते हैं {branch} में?",
            "डिप्लोमा से डिग्री प्रवेश के लिए मेरिट सूची कब जारी होगी {course} में?"
        ],
        "gu": [
            "{course} {branch} માં એડમિશન માટે લાયકાત અને કટઓફ કેટલો છે આ વર્ષે?",
            "ACPC એડમિશન કાઉન્સેલિંગ વખતે કયા ઓરિજિનલ ડોક્યુમેન્ટ્સ જમા કરાવવા {course} માં?",
            "મેનેજમેન્ટ ક્વોટા એડમિશનની પ્રક્રિયા અને ફી શું છે {branch} શાખા માટે?",
            "શું બહારના રાજ્યના વિદ્યાર્થીઓ {course} માં પ્રવેશ મેળવી શકે {branch} માટે?",
            "ડાયરેક્ટ સેકન્ડ યર એન્જિનિયરિંગ માટે મેરિટ લિસ્ટ ક્યારે આવશે {course} માં?"
        ],
        "hi-Latn": [
            "{course} me admission lene ke liye minimum cutoff rank kitni chahiye {branch} me?",
            "ACPC document verification counselling ke liye college kab jana hoga {course} me?",
            "Management quota seat booking ka process aur fees kitni hoti hai {branch} me?",
            "Direct 2nd year admission form kab niklega diploma pass out ke liye {course} me?",
            "{branch} me admission lene ke liye eligibility criteria kya hai {course} me?"
        ],
        "gu-Latn": [
            "College ma admission leva mate ketla marks jaroori che cutoff su chhe {course} ma?",
            "Admission form mate shu eligibility criteria che {course} {branch} ma?",
            "ACPC na round ma college code shu che choice filling mate {course} ma?",
            "Management quota ma admission leva mate office ma kyare contact karvo {branch} mate?",
            "Diploma pachi degree {branch} ma admission mate merit ketle atkase {course} ma?"
        ]
    },
    "syllabus": {
        "en": [
            "Where can I download the updated teaching scheme and syllabus for {branch} {semester}?",
            "What are the core and elective subjects offered in {course} {semester} in {branch}?",
            "What is the credit weightage and marks distribution for practical labs in {branch}?",
            "Has the university revised the curriculum for the current academic year in {course}?",
            "Can I get the detailed syllabus copy for {exam_type} examinations in {branch}?"
        ],
        "hi": [
            "{branch} {semester} के लिए नया पाठ्यक्रम और विषय सूची कहाँ से डाउनलोड करें {course} में?",
            "{course} {semester} में कौन-कौन से अनिवार्य और वैकल्पिक विषय पढ़ाए जाते हैं {branch} में?",
            "{branch} में प्रैक्टिकल लैब का क्रेडिट और अंक विभाजन क्या है {course} के लिए?",
            "क्या वर्तमान शैक्षणिक वर्ष के लिए पाठ्यक्रम में कोई बदलाव किया गया है {branch} में?",
            "{exam_type} परीक्षा के लिए विस्तृत सिलेबस कहाँ उपलब्ध है {course} {branch} का?"
        ],
        "gu": [
            "{branch} {semester} માટે નવો સિલેબસ અને વિષયોની યાદી ક્યાંથી ડાઉનલોડ કરવી {course} માં?",
            "{course} {semester} માં કયા કયા મુખ્ય અને ઓપ્શનલ વિષયો આવે છે {branch} માટે?",
            "{branch} માટે લેબ પ્રેક્ટિકલ અને ક્રેડિટ સિસ્ટમની વિગત આપો {course} માં.",
            "શું આ વર્ષે સિલેબસમાં કોઈ ફેરફાર કરવામાં આવ્યો છે {branch} ના અભ્યાસક્રમમાં?",
            "{exam_type} પરીક્ષા માટે વિગતવાર અભ્યાસક્રમની કોપી ક્યાંથી મળશે {course} {branch} માટે?"
        ],
        "hi-Latn": [
            "{branch} {semester} ka latest syllabus pdf format me kaha se download kare {course} ka?",
            "{course} {semester} me total kitne subjects aur labs padhne hote hain {branch} me?",
            "Credit system aur passing marks ka criteria kya hai syllabus me {branch} ke?",
            "Naya curriculum update hua hai kya university portal par {course} {branch} ke liye?",
            "Elective subject choose karne ka option kab milega {semester} me {branch} me?"
        ],
        "gu-Latn": [
            "{branch} {semester} no new syllabus ane subject details kyathi download karvu {course} ma?",
            "{course} {semester} ma ketla subjects ane practical exam hoy chhe {branch} ma?",
            "Syllabus copy download karva mate direct university link aapo {course} {branch} mate.",
            "Passing marks ane credit points ni system shu che aa varse {branch} ma?",
            "Sem 4 no syllabus ane exam scheme kya jova malse {course} {branch} mate?"
        ]
    },
    "contact_office": {
        "en": [
            "What is the official phone number and email address of the student registrar office in {course}?",
            "What are the student window counter timings for transcript queries in {branch}?",
            "Who should I contact to resolve academic portal login issues for {course} students?",
            "Where is the administrative block located on campus for {branch} inquiries?",
            "Can I book an appointment with the Head of Department for {branch} in {course}?"
        ],
        "hi": [
            "छात्र रजिस्ट्रार कार्यालय का आधिकारिक हेल्पलाइन नंबर और ईमेल क्या है {course} के लिए?",
            "मार्कशीट और प्रशासनिक कार्यों के लिए स्टूडेंट काउंटर का समय क्या है {branch} में?",
            "पोर्टल लॉगिन समस्या के समाधान के लिए किससे संपर्क करना होगा {course} में?",
            "परिसर में प्रशासनिक भवन (एडमिन ब्लॉक) कहाँ स्थित है {branch} के छात्रों के लिए?",
            "विभागाध्यक्ष (HOD) से मिलने का समय क्या निर्धारित है {branch} विभाग में?"
        ],
        "gu": [
            "વિદ્યાર્થી શાખા રજિસ્ટ્રાર ઓફિસનો ફોન નંબર અને ઈમેલ એડ્રેસ શું છે {course} માટે?",
            "સ્ટુડન્ટ વિન્ડો કાઉન્ટર સવારે કેટલા વાગ્યાથી સાંજે કેટલા વાગ્યા સુધી ખુલ્લું રહે છે {branch} માટે?",
            "પોર્ટલ પાસવર્ડ રીસેટ માટે કોનો સંપર્ક કરવો {course} ના વિદ્યાર્થીઓએ?",
            "કેમ્પસમાં એડમિનિસ્ટ્રેટિવ બ્લોક ક્યાં આવેલો છે {branch} પૂછપરછ માટે?",
            "HOD સરને મળવા માટે એપોઈન્ટમેન્ટ કેવી રીતે લેવી {branch} વિભાગમાં?"
        ],
        "hi-Latn": [
            "Student section helpline number aur official email id kya hai {course} ke liye?",
            "Registrar office counter kitne baje khulta hai application dene ke liye {branch} me?",
            "Portal password bhool gaya hu kis department me jakar reset karwau {course} me?",
            "Admin block campus me kis building me situated hai {branch} students ke liye?",
            "HOD sir se milne ke liye visiting hours kya hain {branch} department me?"
        ],
        "gu-Latn": [
            "Student section no contact number ane timings shu che {course} mate?",
            "Registrar office ma call karva mate number aapo enquiry mate {branch} ma?",
            "Student counter sanje ketla vagya sudhi chalu hoy che application mate {course} ma?",
            "Admin office ma javu hoy toh kya aavelu che campus ma {branch} mate?",
            "College helpline number par call lagto nathi alternate number che koi {course} mate?"
        ]
    },
    "id_card": {
        "en": [
            "How do I apply for a replacement duplicate student ID card if lost in {course}?",
            "What is the penalty fee charged for issuing a duplicate college identity card in {branch}?",
            "What documents are required to register for a new freshman student ID card in {course}?",
            "Is the student ID card mandatory for entering the campus and library for {branch} students?",
            "Where can I collect my printed RFID student identity card for {semester}?"
        ],
        "hi": [
            "खोया हुआ छात्र पहचान पत्र (आईडी कार्ड) दोबारा बनवाने की क्या प्रक्रिया है {course} में?",
            "डुप्लीकेट आईडी कार्ड प्राप्त करने का शुल्क कितना है {branch} के लिए?",
            "नया पहचान पत्र प्राप्त करने के लिए कौन से दस्तावेज जमा करने होंगे {course} में?",
            "क्या परिसर और लाइब्रेरी में प्रवेश के लिए आईडी कार्ड पहनना अनिवार्य है {branch} में?",
            "प्रिंटेड आरएफआईडी आईडी कार्ड किस काउंटर से प्राप्त किया जा सकता है {semester} के लिए?"
        ],
        "gu": [
            "ખોવાયેલું આઈ-કાર્ડ ફરીથી કઢાવવા માટે શું પ્રોસેસ કરવી પડે {course} માં?",
            "ડુપ્લિકેટ આઈડી કાર્ડ કઢાવવા કેટલી ફી ભરવી પડે છે {branch} માટે?",
            "નવું આઈડી કાર્ડ કઢાવવા માટે કયા પ્રૂફ આપવાના રહેશે {course} માં?",
            "શું કેમ્પસમાં અને લાઈબ્રેરીમાં પ્રવેશવા માટે આઈડી કાર્ડ ફરજિયાત છે {branch} માટે?",
            "નવું સ્માર્ટ આઈડી કાર્ડ ક્યાંથી મેળવવાનું રહેશે {semester} ના વિદ્યાર્થીઓએ?"
        ],
        "hi-Latn": [
            "Mera college ID card kho gaya hai duplicate kaise banwaye form kaha milega {course} me?",
            "Lost ID card replace karwane ke liye kitni penalty fee pay karni padti hai {branch} me?",
            "New smart ID card student section me kab tak bankar milega {course} me?",
            "Bina ID card ke college me entry mil sakti hai kya gate par {branch} student ko?",
            "ID card ke liye passport size photo kaha submit karni hoti hai {course} me?"
        ],
        "gu-Latn": [
            "ID card khoi gayu che duplicate mate shu karvu pade application kya aapvi {course} ma?",
            "Duplicate ID card kadvava mate ketlo charge lage chhe {branch} mate?",
            "New ID card kadvava mate application kya aapvani student counter par {course} ma?",
            "ID card vagar library ma book issue thay ke nahi {branch} student ne?",
            "Smart card ready thay gayu hoy toh kyathi collect karvanu {course} ma?"
        ]
    },
    "backlog_rules": {
        "en": [
            "What are the university ATKT and backlog clearing regulations for promotion in {course}?",
            "How many backlogs are permissible to enroll in 3rd year {course} {branch}?",
            "When are remedial supplementary examinations conducted for students with backlogs in {branch}?",
            "What is the remedial exam form fee per subject for clearing backlogs in {course}?",
            "Will backlogs affect my eligibility to sit for final campus placements in {branch}?"
        ],
        "hi": [
            "अगले वर्ष में प्रवेश के लिए एटीकेटी और बैकलॉग पास करने के क्या नियम हैं {course} में?",
            "{course} के तृतीय वर्ष में जाने के लिए अधिकतम कितने बैकलॉग की अनुमति है {branch} में?",
            "बैकलॉग वाले छात्रों के लिए रेमेडियल पूरक परीक्षाएं कब आयोजित की जाती हैं {course} में?",
            "बैकलॉग क्लियर करने के लिए प्रति विषय रेमेडियल परीक्षा शुल्क कितना है {branch} में?",
            "क्या बैकलॉग होने पर कैंपस प्लेसमेंट में बैठने की अनुमति मिलती है {course} के छात्रों को?"
        ],
        "gu": [
            "આગલા વર્ષમાં જવા માટે ATKT અને બેકલોગ ક્લિયર કરવાના નિયમો શું છે {course} માં?",
            "{course} ના ત્રીજા વર્ષમાં પ્રમોશન મેળવવા વધુમાં વધુ કેટલા બેકલોગ માન્ય છે {branch} માં?",
            "બેકલોગ વાળા વિદ્યાર્થીઓ માટે રેમેડિયલ પરીક્ષા ક્યારે યોજવામાં આવે છે {course} માં?",
            "રેમેડિયલ પરીક્ષા ફોર્મ ભરવા માટે સબ્જેક્ટ દીઠ કેટલી ફી થાય {branch} માટે?",
            "શું બેકલોગ હોય તો કંપનીના કેમ્પસ ઇન્ટરવ્યુમાં બેસવા દેશે {course} {branch} માં?"
        ],
        "hi-Latn": [
            "Backlog aur ATKT ke rules kya hain next year me promote hone ke liye {course} me?",
            "Kitne maximum backlogs allowed hote hain detention se bachne ke liye {branch} me?",
            "Remedial supplementary exam ka form kab aayega backlog clear karne {course} me?",
            "Ek subject ka backlog exam dene ke liye kitni fee lagti hai {branch} me?",
            "Agar 5th sem me ATKT hai toh 6th sem ke regular paper de sakte hain kya {course} me?"
        ],
        "gu-Latn": [
            "Backlog ane ATKT na rules shu che next year promote thava mate {course} ma?",
            "Ketla backlog hoy toh college ma detain thay {course} {branch} ma?",
            "Remedial exam na form kyare bharavana chhe ATKT clear karva {course} ma?",
            "Per subject remedial exam fee ketli lage portal par {branch} mate?",
            "Backlog hoy toh campus placement ma apply kari shakay ke nahi {course} ma?"
        ]
    },
    "out_of_scope": {
        "en": [
            "Hello, good morning! How are you doing today in college?",
            "Tell me a funny joke about engineering college student life.",
            "Who won the cricket world cup match yesterday night?",
            "What is the weather forecast for this weekend in the city?",
            "Can you write a romantic poem about rain and campus?"
        ],
        "hi": [
            "नमस्ते, आप कैसे हैं और आप कॉलेज में क्या-क्या काम कर सकते हैं?",
            "मुझे कॉलेज जीवन पर एक मजेदार चुटकुला सुनाइए बोर हो रहा हूँ।",
            "आज का ताजा क्रिकेट स्कोर क्या चल रहा है बताइए मैच का?",
            "कल का मौसम कैसा रहने वाला है क्या बारिश होगी शहर में?",
            "क्या आप मेरे लिए एक प्यारी सी कविता लिख सकते हैं कॉलेज पर?"
        ],
        "gu": [
            "નમસ્તે, તમે કેમ છો અને વિદ્યાર્થીઓને શું મદદ કરી શકો કોલેજમાં?",
            "મને એક સરસ મજાની હાસ્ય વાર્તા અથવા જોક કહો કેમ્પસ વિશે.",
            "આજે ક્રિકેટ મેચ કોણ જીત્યું સ્કોર શું છે લાઈવ?",
            "આવતીકાલે વરસાદ પડશે કે ગરમી રહેશે હવામાન કેવું છે શહેરમાં?",
            "તમારો શોખ શું છે અને તમે ક્યાં રહો છો જણાવો ને?"
        ],
        "hi-Latn": [
            "Hello bhai kya haal chaal hai kaise ho aap sab theek chal raha hai?",
            "Ek solid funny joke sunao na bore ho raha hu college canteen me.",
            "Kal match ka score kya tha kis team ne jeeta batao bhai?",
            "Bhai movie dekhne jana chahiye ya hostel me chill kare aaj?",
            "Kya aap mere assignment ka code pura likh kar de sakte ho please?"
        ],
        "gu-Latn": [
            "Kem cho majama cho tame shu kari sako chho mara mate college ma?",
            "Koi mast comedy joke sunavo ne bhai bore thay che lecture ma.",
            "Cricket match ma kon jityu aaje score su thayo batavo ne?",
            "Khavanu su saru male college ni bahar restaurant ma aaje?",
            "Tame kon chho ane tamaro birthday kyare aave che kaho ne?"
        ]
    }
}

def generate_combinatorial_paraphrases(intent_id: str, count: int = 150) -> List[Dict[str, str]]:
    intent_data = INTENT_EXPANSION_TEMPLATES.get(intent_id, INTENT_EXPANSION_TEMPLATES["out_of_scope"])
    languages = ["en", "hi", "gu", "hi-Latn", "gu-Latn"]
    per_lang_target = max(count // len(languages), 30)

    generated = []

    for lang in languages:
        templates = intent_data.get(lang, intent_data["en"])
        prefix_pool = PREFIXES.get(lang, [""])
        suffix_pool = SUFFIXES.get(lang, [""])

        for _ in range(per_lang_target):
            base_tmpl = random.choice(templates)
            use_prefix = random.random() < 0.70
            use_suffix = random.random() < 0.70

            prefix = random.choice(prefix_pool) if use_prefix else ""
            suffix = random.choice(suffix_pool) if use_suffix else ""

            filled = base_tmpl.format(
                course=random.choice(COURSES),
                branch=random.choice(BRANCHES),
                semester=random.choice(SEMESTERS),
                exam_type=random.choice(EXAM_TYPES)
            )

            full_query = f"{prefix}{filled}{suffix}".strip()

            if lang in ["hi-Latn", "gu-Latn"]:
                text = inject_noise(full_query)
            else:
                text = full_query

            generated.append({
                "text": text,
                "intent": intent_id,
                "language": lang
            })

    return generated
