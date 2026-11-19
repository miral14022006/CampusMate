// client/src/config/landing.js
// Configuration and computed copy for the CampusMate landing page and public views.

/**
 * Computes a runtime sample date (today + daysAhead) formatted in en-IN.
 * Defaults to today + 12 days.
 */
export function getSampleDate(daysAhead = 12, locale = 'en-IN') {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Campus helpdesk contact information.
 *
 * These values are intentionally empty until the institution supplies verified
 * details. Set the matching VITE_* variables in client/.env.local (see
 * client/.env.example). Empty values are hidden by the UI instead of showing
 * unverified contact data.
 */
const env = typeof import.meta !== 'undefined' ? import.meta.env : {};

export const CAMPUS_CONTACT = {
  helpdeskEmail: env?.VITE_HELPDESK_EMAIL || '',
  phone: env?.VITE_HELPDESK_PHONE || '',
  phoneTel: (env?.VITE_HELPDESK_PHONE || '').replace(/[^+\d]/g, ''),
  address: env?.VITE_CAMPUS_ADDRESS || '',
  addressShort: env?.VITE_CAMPUS_ADDRESS || '',
  hours: env?.VITE_HELPDESK_HOURS || '',
  studentPortalUrl: env?.VITE_STUDENT_PORTAL_URL || ''
};

/**
 * Disclaimer string required across About and Footer.
 */
export const PROJECT_DISCLAIMER = 'CampusMate is a student project and not an official PDEU service.';

/**
 * Team and department attribution from project specifications.
 */
export const TEAM_INFO = {
  department: 'Department of Computer Science & Engineering',
  institution: 'School of Technology, Pandit Deendayal Energy University (PDEU)',
  location: 'Gandhinagar, Gujarat',
  lead: 'Miral Patel & Final Year Project Team'
};

/**
 * Config-driven statistics (strictly verified from codebase facts):
 * - Languages: 5 (English, Hindi, Gujarati, Hinglish, Gujlish)
 * - Intents: 20 (exact count from data/intents.json)
 * - Document types: 3 (PDF, DOCX, scanned circulars via OCR)
 * - Citation accuracy: 100% Page-Level grounding
 */
export const STATS = [
  { value: 5, suffix: '', label: 'Languages Supported', desc: 'English, Hindi, Gujarati, Hinglish & Gujlish' },
  { value: 20, suffix: '', label: 'Campus Intents', desc: 'Covering exams, fees, hostels, library, results & more' },
  { value: 3, suffix: '+', label: 'Document Formats', desc: 'Official PDFs, Word DOCX & Scanned Notice OCR' },
  { value: 100, suffix: '%', label: 'Page-Level Citations', desc: 'Every claim links directly to official circulars' }
];

/**
 * Features Bento Grid: 8 cards in a fully filled grid with no holes
 * Card = icon, title, description of at most 16 words, one tag.
 */
export const BENTO_FEATURES = [
  {
    id: 'hybrid-retrieval',
    title: 'Hybrid neural search',
    tag: 'BM25 + FAISS',
    description: 'BM25 keyword matching fused with dense semantic vector embeddings for pinpoint paragraph retrieval.'
  },
  {
    id: 'multilingual',
    title: 'Truly multilingual',
    tag: '5 languages',
    description: 'Ask naturally in English, Hindi, Gujarati, Hinglish or Gujlish with built-in normalisation.'
  },
  {
    id: 'page-citations',
    title: 'Verified citations',
    tag: 'Page-level',
    description: 'Every statement links directly to the exact circular and page number for immediate inspection.'
  },
  {
    id: 'ocr-engine',
    title: 'OCR for scanned notices',
    tag: 'Tesseract OCR',
    description: 'Scanned paper circulars and noticeboard photos are deskewed, cleaned and indexed as text.'
  },
  {
    id: 'smart-clarification',
    title: 'Smart clarification',
    tag: 'Active dialogue',
    description: 'Ambiguous queries trigger quick multiple-choice prompts to identify your exact branch or semester.'
  },
  {
    id: 'conversation-memory',
    title: 'Contextual memory',
    tag: 'Session state',
    description: 'Preserves prior context across turns so follow-up queries flow naturally without repeating details.'
  },
  {
    id: 'versioning',
    title: 'Newest notice wins',
    tag: 'Auto conflict fix',
    description: 'Automatic timestamp resolution ensures newly released circulars supersede outdated dates or fee notices.'
  },
  {
    id: 'calendar-reminders',
    title: 'Calendar reminders',
    tag: 'Google & iCal',
    description: 'Deadlines and exam dates automatically extract with one-click export directly to personal calendars.',
    link: '/calendar',
    linkText: 'Explore Calendar →'
  }
];

/**
 * "Under the hood" pipeline architecture components based on real services in:
 * - nlp-service/app/pipeline.py
 * - nlp-service/features/f02_transliteration/engine.py
 * - nlp-service/features/f03_transformer_intent/inference.py
 * - nlp-service/features/f01_hybrid_retrieval/
 * - nlp-service/features/f04_rag/
 */
export const ARCHITECTURE_STAGES = [
  {
    step: '01',
    name: 'Language Detection',
    tech: 'Regex Script Heuristics',
    desc: 'Determines Latin, Devanagari, or Gujarati script and identifies code-mixed Hinglish & Gujlish.'
  },
  {
    step: '02',
    name: 'Transliteration',
    tech: 'IndicXlit & Lexicon Rules',
    desc: 'Converts Hinglish and Gujlish to canonical native script while protecting college English vocabulary.'
  },
  {
    step: '03',
    name: 'Intent Classification',
    tech: 'Google MuRIL Transformer',
    desc: 'Fine-tuned multilingual transformer categorizes queries into 20 campus intents with calibrated confidence.'
  },
  {
    step: '04',
    name: 'Hybrid Retrieval',
    tech: 'BM25 + FAISS + Cross-Encoder',
    desc: 'Reciprocal Rank Fusion merges sparse BM25 hits and dense e5 vector chunks with reranking.'
  },
  {
    step: '05',
    name: 'Grounded Synthesis',
    tech: 'RAG Prompt Builder',
    desc: 'Strict evidence gating rejects ungrounded claims and synthesizes answers strictly from source text.'
  },
  {
    step: '06',
    name: 'Citation Verification',
    tech: 'Hallucination Fact Guard',
    desc: 'Validates claims against retrieved page chunks and attaches interactive document source tags.'
  }
];

/**
 * 5-Language interactive showcase tabs
 */
export function getLanguageDemos() {
  const deadlineDate = getSampleDate(12);
  return [
    {
      id: 'en',
      label: 'English',
      nativeLabel: 'English',
      fontClass: '',
      question: 'When is the last date to submit Semester 5 exam forms?',
      badge: 'English · Official',
      answer: `The exam registration deadline for Semester 5 is ${deadlineDate}. A late fee of ₹500 applies after this date.`,
      source: 'Exam Notice 2025 (Page 1)'
    },
    {
      id: 'hi',
      label: 'Hindi',
      nativeLabel: 'हिन्दी',
      fontClass: 'font-devanagari',
      question: 'सेमेस्टर 5 की परीक्षा फॉर्म जमा करने की अंतिम तिथि क्या है?',
      badge: 'हिन्दी · Devanagari',
      answer: `सेमेस्टर 5 के लिए परीक्षा पंजीकरण की अंतिम तिथि ${deadlineDate} है। इस तारीख के बाद ₹500 का विलंब शुल्क लागू होगा।`,
      source: 'परीक्षा सूचना 2025 (पृष्ठ 1)'
    },
    {
      id: 'gu',
      label: 'Gujarati',
      nativeLabel: 'ગુજરાતી',
      fontClass: 'font-gujarati',
      question: 'સેમેસ્ટર 5 માટે પરીક્ષા ફોર્મ ભરવાની છેલ્લી તારીખ કઈ છે?',
      badge: 'ગુજરાતી · Gujarati Script',
      answer: `સેમેસ્ટર 5 માટે પરીક્ષા નોંધણીની છેલ્લી તારીખ ${deadlineDate} છે. આ તારીખ પછી ₹500 નો લેટ ફી દંડ લાગુ પડશે.`,
      source: 'પરીક્ષા પરિપત્ર 2025 (પાનું 1)'
    },
    {
      id: 'hinglish',
      label: 'Hinglish',
      nativeLabel: 'Hinglish',
      fontClass: '',
      question: 'Sem 5 ka exam form submit karne ki last date kab tak hai?',
      badge: 'Hinglish · Romanized Hindi',
      answer: `Semester 5 ka exam registration deadline ${deadlineDate} hai. Iske baad submit karne par ₹500 late fee lagegi.`,
      source: 'Exam Circular 2025 (Page 1)'
    },
    {
      id: 'gujlish',
      label: 'Gujlish',
      nativeLabel: 'Gujlish',
      fontClass: '',
      question: 'Sem 5 nu exam form bharvani last date kai che?',
      badge: 'Gujlish · Romanized Gujarati',
      answer: `Semester 5 mate exam registration ni last date ${deadlineDate} che. Aa date pachi ₹500 late fee lago padshe.`,
      source: 'Exam Notice 2025 (Page 1)'
    }
  ];
}

/**
 * Calendar spotlight mock event helper
 */
export function getCalendarEventData() {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 12);

  const startIso = targetDate.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z';
  const endIso = targetDate.toISOString().replace(/-|:|\.\d\d\d/g, '').slice(0, 15) + 'Z';
  const title = encodeURIComponent('PDEU Semester 5 Exam Registration Deadline');
  const details = encodeURIComponent('Exam registration deadline for Semester 5. Late fee ₹500 applies afterwards. Source: CampusMate / Exam Notice (Page 1)');
  const location = encodeURIComponent('Pandit Deendayal Energy University, Gandhinagar');

  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;

  return {
    targetDate,
    formattedDate: targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    dayNumber: targetDate.getDate(),
    monthName: targetDate.toLocaleDateString('en-IN', { month: 'long' }),
    year: targetDate.getFullYear(),
    gcalUrl
  };
}

/**
 * Frequently Asked Questions (8 comprehensive items)
 */
export const FAQ_ITEMS = [
  {
    q: 'Which languages does CampusMate support?',
    a: 'CampusMate fully supports 5 language formats: standard English, Hindi (Devanagari), Gujarati script, and colloquial transliterated Hinglish and Gujlish (Hindi/Gujarati written in English letters).'
  },
  {
    q: 'Where do the answers come from?',
    a: 'All answers are strictly grounded in official university notices, examination timetables, fee circulars, academic calendars, and hostel guidelines uploaded to the institutional repository. CampusMate does not invent answers.'
  },
  {
    q: 'What happens if CampusMate does not know the answer?',
    a: 'If a question cannot be verified against official documents or has low retrieval confidence, CampusMate explicitly states that information is not available in official circulars and routes you to the campus helpdesk.'
  },
  {
    q: 'Is my chat history saved or shared with third parties?',
    a: 'Your chat history is saved locally in your browser session for your convenience. No personal conversations are sold, shared, or used to train external public language models.'
  },
  {
    q: 'Is CampusMate an official PDEU service?',
    a: 'No. CampusMate is an academic capstone and research student project developed in the Department of Computer Science & Engineering, PDEU. While answers are grounded in official notices, students should always verify critical dates against official pdeu.ac.in circulars.'
  },
  {
    q: 'How does the "Add to Google Calendar" feature work?',
    a: 'When an official circular specifies a deadline or exam date, CampusMate detects the date and provides a direct Google Calendar template link. Clicking it opens your calendar with the event, timings, and notice citation pre-filled.'
  },
  {
    q: 'Does CampusMate work with photographed or scanned notices?',
    a: 'Yes! The backend integrates an OCR (Optical Character Recognition) pipeline that deskews, cleans, and extracts text from scanned circulars and photographed paper notices posted on university noticeboards.'
  },
  {
    q: 'Who built CampusMate?',
    a: 'CampusMate was built by final-year students in the Department of Computer Science & Engineering at Pandit Deendayal Energy University (PDEU) as a citation-grounded multilingual assistant.'
  }
];

/**
 * Interactive demo strip configuration.
 */
export function getDemoNotice() {
  const deadlineDate = getSampleDate(12);
  const cal = getCalendarEventData();
  return {
    question: 'When is the exam registration deadline?',
    answerText: `The exam registration deadline for Semester 5 is ${deadlineDate}. A late fee of ₹500 applies after this date.`,
    deadlineDate,
    source: 'Exam Notice 2025 (Page 1)',
    chips: ['Fee details?', 'Exam schedule?', 'Hostel rules?'],
    isSample: true,
    sampleTag: 'Sample notice',
    gcalUrl: cal.gcalUrl
  };
}
