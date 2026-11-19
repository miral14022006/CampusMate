export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)'
];

export const INTENT_COLORS = CHART_COLORS;

export function intentLabel(intent) {
  if (!intent) return 'Unknown';
  const map = {
    exam_form_deadline: 'Exam Related',
    exam: 'Exam Related',
    exam_schedule: 'Exam Related',
    re_evaluation: 'Exam Related',
    fee_payment: 'Fee Information',
    fee_structure: 'Fee Information',
    admission: 'Admission',
    holidays: 'Academic Calendar',
    syllabus: 'Academic Calendar',
    attendance_rules: 'Academic Rules',
    backlog_rules: 'Academic Rules',
    hostel: 'Hostel',
    scholarship: 'Scholarship',
    placement: 'Placement',
    library_timings: 'Library',
    bus_transport: 'Transport',
    bonafide_certificate: 'Certificates',
    contact_office: 'Contact',
    out_of_scope: 'Out of scope'
  };
  if (map[intent]) return map[intent];
  return String(intent)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getRangeStart(days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.toISOString();
}

export function buildIntentData(rows = [], limit = 4) {
  const sorted = [...rows]
    .filter((row) => row && row.intent)
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  const head = sorted.slice(0, limit).map((row) => ({
    name: intentLabel(row.intent),
    value: Number(row.count) || 0
  }));
  const rest = sorted.slice(limit).reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  if (rest > 0) head.push({ name: 'Others', value: rest });

  const total = head.reduce((sum, row) => sum + row.value, 0);
  return head.map((row) => ({ ...row, percentage: total ? (row.value / total) * 100 : 0 }));
}

export function aggregateLanguages(rows = []) {
  const order = [
    ['en', 'English'],
    ['hi', 'Hindi'],
    ['gu', 'Gujarati'],
    ['hi-Latn', 'Hinglish'],
    ['gu-Latn', 'Gujlish']
  ];
  const lookup = new Map();
  rows.forEach((row) => {
    const key = String(row.language || '').toLowerCase();
    const canonical =
      key === 'en' || key === 'english'
        ? 'en'
        : key === 'hi' || key === 'hindi'
          ? 'hi'
          : key === 'gu' || key === 'gujarati'
            ? 'gu'
            : key === 'hi-latn' || key === 'hinglish'
              ? 'hi-Latn'
              : key === 'gu-latn' || key === 'gujlish'
                ? 'gu-Latn'
                : key;
    lookup.set(canonical, (lookup.get(canonical) || 0) + (Number(row.count) || 0));
  });
  return order.map(([code, label]) => ({ code, name: label, value: lookup.get(code) || 0 }));
}

export function splitSeries(series = []) {
  if (!Array.isArray(series) || series.length < 2) return [series, []];
  const middle = Math.floor(series.length / 2);
  return [series.slice(0, middle), series.slice(middle)];
}

export function average(numbers = []) {
  const valid = numbers.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
