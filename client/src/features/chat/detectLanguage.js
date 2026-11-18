const HINGLISH_MARKERS = [
  'hai', 'hain', 'kya', 'kaise', 'kitna', 'kitni', 'bhai', 'nahi', 'nahin', 'karna', 'karo',
  'kab', 'kahan', 'mera', 'meri', 'chahiye', 'milega', 'batao', 'bata', 'kijiye', 'hoga', 'hogi',
  'ka', 'ki', 'ke', 'ko', 'se', 'me', 'mein', 'par', 'aur', 'bhi', 'toh', 'thoda', 'jaldi',
  'form', 'bharne', 'bharna', 'last', 'date', 'deadline', 'fees', 'fee', 'hostel', 'exam'
];

const GUJLISH_MARKERS = [
  'chhe', 'che', 'chho', 'cho', 'chhu', 'chu', 'kai', 'kem', 'su', 'shu', 'tame', 'hu', 'hun',
  'nathi', 'nathi', 'male', 'malse', 'karo', 'karvu', 'karva', 'aapo', 'joiye', 'joie', 'bharva',
  'bharvani', 'ketli', 'ketlu', 'ketla', 'ma', 'na', 'ni', 'nu', 'ne', 'ane', 'pan', 'aa', 'tamara',
  'tamari', 'kaho', 'batao', 'kya', 'chhata', 'avse', 'thai', 'thay', 'hatu', 'hase'
];

const WORD_SPLIT = /[\s,.?!;:()[\]{}"'/\\]+/;

export function detectLanguage(text = '') {
  const value = text.trim();
  if (!value) return null;
  if (/[\u0900-\u097F]/.test(value)) return 'hi';
  if (/[\u0A80-\u0AFF]/.test(value)) return 'gu';

  const words = value.toLowerCase().split(WORD_SPLIT).filter(Boolean);
  if (words.length === 0) return 'en';

  let hinglish = 0;
  let gujlish = 0;
  for (const word of words) {
    if (GUJLISH_MARKERS.includes(word)) gujlish += 1;
    else if (HINGLISH_MARKERS.includes(word)) hinglish += 1;
  }

  // Shared vocabulary ("kya", "fees") leans Hinglish; explicit Gujarati markers win.
  if (gujlish > hinglish && gujlish > 0) return 'gu-Latn';
  if (hinglish > 0) return 'hi-Latn';
  return 'en';
}

export function languagePillLabel(code) {
  return (
    {
      en: 'English',
      hi: 'Hindi',
      gu: 'Gujarati',
      'hi-Latn': 'Hinglish',
      'gu-Latn': 'Gujlish'
    }[code] || null
  );
}

export function isIndicLanguage(code) {
  return code === 'hi' || code === 'gu';
}

export default detectLanguage;
