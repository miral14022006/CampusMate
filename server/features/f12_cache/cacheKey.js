const crypto = require('crypto');

/**
 * Normalizes query string for caching:
 * - Lowercase
 * - Collapse multiple whitespaces
 * - Strip non-alphanumeric punctuation (except Indic unicode)
 */
function normalizeQuery(query) {
  if (!query) return '';
  return query
    .trim()
    .toLowerCase()
    .replace(/[?!.,;:"'()[\]{}]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes slots dictionary into a deterministic sorted string
 */
function normalizeSlots(slots) {
  if (!slots || typeof slots !== 'object') return '';
  return Object.keys(slots)
    .sort()
    .filter((k) => slots[k] !== null && slots[k] !== undefined && slots[k] !== '')
    .map((k) => `${k}:${String(slots[k]).toLowerCase().trim()}`)
    .join('|');
}

/**
 * Generates deterministic cache key:
 * key = hash(normalized query + language + slots + index_version)
 */
function generateCacheKey(query, language = 'en', slots = null, indexVersion = 'v1') {
  const normQ = normalizeQuery(query);
  const normLang = (language || 'en').toLowerCase().trim();
  const normSlots = normalizeSlots(slots);
  const rawPayload = `${normQ}#${normLang}#${normSlots}#${indexVersion}`;

  const hash = crypto.createHash('sha256').update(rawPayload).digest('hex').substring(0, 32);
  return `nlp_cache:${indexVersion}:${hash}`;
}

module.exports = {
  normalizeQuery,
  normalizeSlots,
  generateCacheKey
};

