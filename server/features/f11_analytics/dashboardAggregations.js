/**
 * Feature 11 dashboard aggregation helpers.
 * All functions are pure so they can be unit-tested without a database.
 */

const GRANULARITIES = new Set(['hour', 'day', 'week']);
const VIEW_WINDOW_MS = 30 * 60 * 1000;

function parseRange(from, to) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86400000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const fallbackEnd = new Date();
    return { from: new Date(fallbackEnd.getTime() - 30 * 86400000), to: fallbackEnd };
  }
  if (start > end) return { from: end, to: start };
  return { from: start, to: end };
}

function previousRange(from, to) {
  const span = Math.max(to.getTime() - from.getTime(), 1);
  return { from: new Date(from.getTime() - span), to: new Date(from.getTime() - 1) };
}

function normalizeGranularity(value) {
  return GRANULARITIES.has(value) ? value : 'day';
}

function granularityFormat(granularity) {
  if (granularity === 'hour') return '%Y-%m-%dT%H:00:00.000Z';
  if (granularity === 'week') return '%G-W%V';
  return '%Y-%m-%d';
}

function demoMatch(includeDemo) {
  if (includeDemo === 'only') return { isDemo: true };
  if (includeDemo === 'true' || includeDemo === true) return {};
  return { isDemo: { $ne: true } };
}

function buildActivityMatch({ from, to, semester, branch, includeDemo, extra = {} }) {
  const match = {
    createdAt: { $gte: from, $lte: to },
    ...demoMatch(includeDemo),
    ...extra
  };
  if (semester && semester !== 'all') match['meta.semester'] = Number(semester);
  if (branch && branch !== 'all') match['meta.branch'] = branch;
  return match;
}

function percentageChange(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function rate(numerator, denominator, fallback = 0) {
  const n = Number(numerator) || 0;
  const d = Number(denominator) || 0;
  return d === 0 ? fallback : Math.round((n / d) * 1000) / 10;
}

function calculateP95(values = []) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index];
}

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = String(email).split('@');
  if (!domain) return `${String(email).slice(0, 2)}***`;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskName(name) {
  if (!name) return 'Student';
  const parts = String(name).trim().split(/\s+/);
  return parts.map((part) => `${part.charAt(0)}***`).join(' ');
}

function identityFor(user, role) {
  if (!user) return { name: 'Unknown', email: '' };
  if (role === 'superadmin') return { name: user.name || '', email: user.email || '' };
  return { name: maskName(user.name), email: maskEmail(user.email) };
}

function uniqueViewerKey(event) {
  return String(event.userId || event.clientId || 'unknown');
}

/**
 * Counts document views uniquely per (person, document) per 30-minute window.
 * Every raw event is retained; this function only affects aggregation.
 */
function uniqueViewWindows(events, { docId } = {}) {
  const seen = new Set();
  for (const event of events) {
    if (event.type !== 'document_view') continue;
    const id = String(event.meta?.docId || '');
    if (docId && id !== String(docId)) continue;
    const bucket = Math.floor(new Date(event.createdAt).getTime() / VIEW_WINDOW_MS);
    seen.add(`${uniqueViewerKey(event)}|${id}|${bucket}`);
  }
  return seen.size;
}

function buildUniqueViewBuckets({ from, to, docId } = {}) {
  const match = { type: 'document_view', createdAt: { $gte: from, $lte: to } };
  if (docId) match['meta.docId'] = String(docId);
  return [
    { $match: match },
    {
      $addFields: {
        personKey: { $ifNull: ['$userId', '$clientId'] },
        bucket: {
          $subtract: [
            { $toLong: '$createdAt' },
            { $mod: [{ $toLong: '$createdAt' }, VIEW_WINDOW_MS] }
          ]
        }
      }
    },
    {
      $group: {
        _id: { person: '$personKey', docId: '$meta.docId', bucket: '$bucket' },
        count: { $sum: 1 }
      }
    },
    { $count: 'uniqueWindows' }
  ];
}

function buildActivitySummaryPipeline(match) {
  return [
    { $match: match },
    {
      $group: {
        _id: null,
        queries: { $sum: { $cond: [{ $eq: ['$type', 'chat_query'] }, 1, 0] } },
        documentViews: { $sum: { $cond: [{ $eq: ['$type', 'document_view'] }, 1, 0] } },
        downloads: { $sum: { $cond: [{ $eq: ['$type', 'document_download'] }, 1, 0] } },
        calendarAdds: { $sum: { $cond: [{ $eq: ['$type', 'calendar_add'] }, 1, 0] } },
        signups: { $sum: { $cond: [{ $eq: ['$type', 'signup'] }, 1, 0] } },
        activeStudents: {
          $addToSet: {
            $cond: [{ $and: [{ $eq: ['$actorType', 'student'] }, { $ne: ['$userId', null] }] }, '$userId', null]
          }
        },
        guestClients: {
          $addToSet: {
            $cond: [{ $and: [{ $eq: ['$actorType', 'guest'] }, { $ne: ['$clientId', null] }] }, '$clientId', null]
          }
        },
        conversations: { $addToSet: '$meta.conversationId' },
        viewers: {
          $addToSet: {
            $cond: [{ $eq: ['$type', 'document_view'] }, { $ifNull: ['$userId', '$clientId'] }, null]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        queries: 1,
        documentViews: 1,
        downloads: 1,
        calendarAdds: 1,
        signups: 1,
        activeStudents: { $size: { $setDifference: ['$activeStudents', [null]] } },
        guestVisitors: { $size: { $setDifference: ['$guestClients', [null]] } },
        conversations: { $size: { $setDifference: ['$conversations', [null]] } },
        viewers: { $size: { $setDifference: ['$viewers', [null]] } }
      }
    }
  ];
}

function buildTimeSeriesPipeline(match, granularity) {
  return [
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: granularityFormat(granularity), date: '$createdAt' } },
        queries: { $sum: { $cond: [{ $eq: ['$type', 'chat_query'] }, 1, 0] } },
        documentViews: { $sum: { $cond: [{ $eq: ['$type', 'document_view'] }, 1, 0] } },
        userIds: {
          $addToSet: {
            $cond: [{ $eq: ['$actorType', 'student'] }, '$userId', null]
          }
        }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        queries: 1,
        documentViews: 1,
        activeStudents: { $size: { $setDifference: ['$userIds', [null]] } }
      }
    }
  ];
}

function buildHeatmapPipeline(match) {
  return [
    { $match: match },
    {
      $group: {
        _id: { weekday: { $dayOfWeek: '$createdAt' }, hour: { $hour: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.weekday': 1, '_id.hour': 1 } },
    {
      $project: {
        _id: 0,
        weekday: { $subtract: ['$_id.weekday', 1] },
        hour: '$_id.hour',
        count: 1
      }
    }
  ];
}

function buildTopIntentsPipeline(match, limit = 10) {
  return [
    { $match: { ...match, type: 'chat_query' } },
    { $group: { _id: '$meta.intent', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, intent: { $ifNull: ['$_id', 'unknown'] }, count: 1 } }
  ];
}

function buildLanguagePipeline(match) {
  return [
    { $match: { ...match, type: 'chat_query' } },
    { $group: { _id: '$meta.language', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, language: { $ifNull: ['$_id', 'unknown'] }, count: 1 } }
  ];
}

function buildDocumentUsagePipeline(match) {
  return [
    { $match: { ...match, type: { $in: ['document_view', 'document_download'] } } },
    {
      $group: {
        _id: { $ifNull: ['$meta.docId', 'unknown'] },
        views: { $sum: { $cond: [{ $eq: ['$type', 'document_view'] }, 1, 0] } },
        downloads: { $sum: { $cond: [{ $eq: ['$type', 'document_download'] }, 1, 0] } },
        lastViewed: { $max: '$createdAt' },
        pages: { $push: { $cond: [{ $eq: ['$type', 'document_view'] }, '$meta.page', '$$REMOVE'] } }
      }
    },
    { $sort: { views: -1 } }
  ];
}

module.exports = {
  VIEW_WINDOW_MS,
  parseRange,
  previousRange,
  normalizeGranularity,
  granularityFormat,
  demoMatch,
  buildActivityMatch,
  percentageChange,
  rate,
  calculateP95,
  maskEmail,
  maskName,
  identityFor,
  uniqueViewWindows,
  buildUniqueViewBuckets,
  buildActivitySummaryPipeline,
  buildTimeSeriesPipeline,
  buildHeatmapPipeline,
  buildTopIntentsPipeline,
  buildLanguagePipeline,
  buildDocumentUsagePipeline
};
