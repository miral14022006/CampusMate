/**
 * Generates 2,000 realistic synthetic analytics log rows spanning the last 30 days.
 * Includes realistic distributions across languages, intents, fallback rates, and latencies.
 */

const INTENTS = [
  'exam_form_deadline',
  'fee_payment',
  'fee_structure',
  'attendance_rules',
  'scholarship',
  'holidays',
  'hostel',
  'admission',
  're_evaluation',
  'placement',
  'bonafide_certificate',
  'library_timings',
  'bus_transport',
  'syllabus',
  'backlog_rules',
  'contact_office',
  'out_of_scope'
];

const INTENT_DOC_MAP = {
  exam_form_deadline: 'academic_regulations_2024.pdf',
  fee_payment: 'fee_circular_2024.pdf',
  fee_structure: 'fee_circular_2024.pdf',
  attendance_rules: 'academic_regulations_2024.pdf',
  scholarship: 'scholarship_notice_2024.pdf',
  holidays: 'academic_calendar_2024.pdf',
  hostel: 'hostel_rules_2024.pdf',
  admission: 'admission_brochure_2024.pdf',
  re_evaluation: 'exam_circular_2024.pdf',
  placement: 'placement_report_2023.pdf',
  bonafide_certificate: 'academic_handbook_2024.pdf',
  library_timings: 'library_handbook_2024.pdf',
  bus_transport: 'bus_routes_schedule_2024.pdf',
  syllabus: 'syllabus_btech_mech.pdf',
  backlog_rules: 'academic_regulations_2024.pdf',
  contact_office: 'campus_contacts.pdf',
  out_of_scope: null
};

const LANGUAGES = ['en', 'hi', 'gu', 'hi-Latn', 'gu-Latn'];
const LANG_WEIGHTS = [0.35, 0.20, 0.15, 0.18, 0.12]; // ~35% EN, 20% HI, 15% GU, 18% Hinglish, 12% Gujlish

const SAMPLE_QUERIES = {
  en: [
    'What is the last date to submit exam form?',
    'How do I pay my semester college fee online?',
    'What are the library opening and closing hours?',
    'Is 75% attendance mandatory for exam hall ticket?',
    'What are the college bus routes and stops?'
  ],
  hi: [
    'परीक्षा फॉर्म भरने की अंतिम तारीख क्या है?',
    'हॉस्टल में मेस का खाना और नियम क्या हैं?',
    'क्या 75% उपस्थिति परीक्षा के लिए अनिवार्य है?',
    'कॉलेज में फीस जमा करने का क्या प्रोसेस है?'
  ],
  gu: [
    'પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ કઈ છે?',
    'હોસ્ટેલ પ્રવેશ અને ફી વિશે માહિતી આપો.',
    'લાઇબ્રેરી માંથી બુક ઇશ્યુ કરાવવાના નિયમો શું છે?'
  ],
  'hi-Latn': [
    'Exam form bharne ki last date kya hai bhai?',
    'Hostel in-time aur gate closing time kya hai night me?',
    'Semester fee online portal se kaise bhare?'
  ],
  'gu-Latn': [
    'College ma admission mate ketli fees chhe?',
    'Bus na routes ane pickup point kya chhe?',
    'Supplementary exam form ni fees ketli chhe?'
  ]
};

const UNANSWERED_FALLBACK_QUERIES = [
  { q: 'Can I transfer my hostel room to another block?', l: 'en' },
  { q: 'What is the WiFi password for block C labs?', l: 'en' },
  { q: 'क्या मुझे कैंटीन में डिस्काउंट कूपन मिल सकता है?', l: 'hi' },
  { q: 'Gym membership fee kitni hai campus me?', l: 'hi-Latn' },
  { q: 'College grounds ma cricket match ramva permission joiye?', l: 'gu-Latn' },
  { q: 'HOD sir no personal contact number aapo meeting mate', l: 'gu-Latn' },
  { q: 'Will tomorrow be declared a sudden rain holiday?', l: 'en' },
  { q: 'Who won the annual sports day cricket tournament last week?', l: 'en' }
];

function pickWeighted(items, weights) {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSyntheticLogs(count = 2000) {
  const logs = [];
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - Math.floor(Math.random() * thirtyDaysMs));
    const isUnanswered = Math.random() < 0.12; // 12% unanswered/fallback
    const isClarification = !isUnanswered && Math.random() < 0.08; // 8% clarification
    const isCached = !isClarification && Math.random() < 0.45; // 45% cache hit

    let language, query, intent, decision, sourceDoc, confidence;

    if (isUnanswered) {
      const unItem = UNANSWERED_FALLBACK_QUERIES[getRandomInt(0, UNANSWERED_FALLBACK_QUERIES.length - 1)];
      language = unItem.l;
      query = unItem.q;
      intent = 'out_of_scope';
      decision = 'FALLBACK';
      sourceDoc = null;
      confidence = Math.round((Math.random() * 0.35 + 0.1) * 100) / 100;
    } else {
      language = pickWeighted(LANGUAGES, LANG_WEIGHTS);
      const qPool = SAMPLE_QUERIES[language] || SAMPLE_QUERIES.en;
      query = qPool[getRandomInt(0, qPool.length - 1)];
      intent = INTENTS[getRandomInt(0, INTENTS.length - 2)]; // Exclude out_of_scope
      decision = isClarification ? 'CLARIFY' : 'ANSWER';
      sourceDoc = INTENT_DOC_MAP[intent] || 'academic_regulations_2024.pdf';
      confidence = Math.round((Math.random() * 0.35 + 0.65) * 100) / 100;
    }

    // Feedback rating (thumbs up / down)
    let rating = null;
    if (Math.random() < 0.25) { // 25% of users give feedback
      rating = isUnanswered ? (Math.random() < 0.8 ? 'down' : 'up') : (Math.random() < 0.92 ? 'up' : 'down');
    }

    // Latency modeling
    let totalLatencyMs;
    if (isCached) {
      totalLatencyMs = Math.round(Math.random() * 8 + 4); // 4-12ms cache
    } else {
      totalLatencyMs = Math.round(Math.random() * 180 + 120); // 120-300ms live NLP pipeline
    }

    const normQuery = query.toLowerCase().replace(/[^\w\s]/g, '').trim();

    logs.push({
      requestId: `synth_req_${i}_${Date.now()}`,
      sessionId: `synth_sess_${getRandomInt(100, 500)}`,
      query,
      normalizedQuery: normQuery,
      language,
      intent,
      confidence,
      sourceDoc,
      decision,
      isUnanswered,
      isClarification,
      cached: isCached,
      rating,
      totalLatencyMs,
      nlpExecutionTimeMs: isCached ? 0 : totalLatencyMs - getRandomInt(5, 15),
      stageLatencies: {
        language_detection: 4,
        transliteration: language.includes('Latn') ? 12 : 0,
        intent_classifier: 24,
        retrieval: 85,
        rag_answer: 45
      },
      isSeeded: true,
      createdAt: timestamp
    });
  }

  return logs;
}

module.exports = {
  generateSyntheticLogs
};

