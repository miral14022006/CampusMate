export function formatCompactNumber(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(n / 1_000)}K`;
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

function trim(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatPercent(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits).replace(/\.0$/, '')}%`;
}

export function formatMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 2).replace(/\.00$/, '')}s`;
  return `${Math.round(n)}ms`;
}

export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {})
  });
}

export function formatShortDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  const diff = now - date.getTime();
  if (Number.isNaN(diff)) return '—';
  if (diff < 45_000) return 'just now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatShortDate(date);
}

export function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const LANGUAGE_LABELS = {
  en: 'English',
  english: 'English',
  hi: 'Hindi',
  hindi: 'Hindi',
  gu: 'Gujarati',
  gujarati: 'Gujarati',
  'hi-latn': 'Hinglish',
  hinglish: 'Hinglish',
  'gu-latn': 'Gujlish',
  gujlish: 'Gujlish',
  mixed: 'Mixed'
};

export function languageLabel(code) {
  if (!code) return 'Unknown';
  return LANGUAGE_LABELS[String(code).toLowerCase()] || String(code);
}

export function languageScript(code) {
  const key = String(code || '').toLowerCase();
  if (key === 'hi' || key === 'hindi') return 'devanagari';
  if (key === 'gu' || key === 'gujarati') return 'gujarati';
  return null;
}

export function titleCaseIntent(intent) {
  if (!intent) return 'Unknown';
  if (intent === 'out_of_scope') return 'Out of scope';
  return String(intent)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function capitalize(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

export function truncate(value = '', length = 60) {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1).trimEnd()}…`;
}

export function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U'
  );
}

export function percentOf(part, total) {
  if (!total) return 0;
  return (Number(part) / Number(total)) * 100;
}

export function seriesDelta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// YYYY-MM-DD in the user's local timezone (toISOString would shift in UTC-negative zones).
export function localDateISO(date = new Date()) {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
