const crypto = require('crypto');
const ActivityEvent = require('./models/ActivityEvent');

const memoryEvents = [];
const MAX_MEMORY_EVENTS = 5000;
const VIEW_WINDOW_MS = 30 * 60 * 1000;

function getSalt() {
  return process.env.IP_HASH_SALT || 'campusmate-activity-default-salt';
}

/**
 * Salted SHA-256. Raw IP addresses are never persisted or returned.
 */
function hashIp(ip) {
  if (!ip) return null;
  const raw = String(ip).split(',')[0].trim();
  if (!raw) return null;
  return crypto.createHash('sha256').update(`${getSalt()}:${raw}`).digest('hex');
}

function userAgentFamily(userAgent = '') {
  const ua = String(userAgent);
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : /curl|python|node|axios/i.test(ua)
              ? 'API'
              : 'Other';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown';
  return `${browser} / ${os}`;
}

function getClientIp(req) {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function normalizeMeta(meta = {}) {
  const allowed = [
    'docId',
    'page',
    'conversationId',
    'intent',
    'language',
    'category',
    'messageId',
    'rating',
    'semester',
    'branch',
    'path',
    'source'
  ];
  const out = {};
  for (const key of allowed) {
    const value = meta[key];
    if (value === undefined || value === null || value === '') continue;
    out[key] =
      key === 'page' || key === 'semester'
        ? Number(value)
        : key === 'path'
          ? String(value).slice(0, 300)
          : String(value).slice(0, 200);
  }
  return out;
}

function resolveActor(req, userId, actorType) {
  const id = userId || req?.user?._id || req?.user?.id || null;
  if (actorType) return { userId: id, actorType };
  const role = req?.user?.role;
  if (role === 'admin' || role === 'superadmin') return { userId: id, actorType: 'admin' };
  if (id) return { userId: id, actorType: 'student' };
  return { userId: null, actorType: 'guest' };
}

/**
 * Persist one activity event. Deliberately never throws and never awaits anything
 * the caller needs for correctness. Callers should still await when convenient so
 * tests can assert the write, but a rejected DB write is swallowed.
 */
async function record(event = {}) {
  try {
    if (!event || !event.type) return null;
    const { req } = event;
    const { userId, actorType } = resolveActor(req, event.userId, event.actorType);
    const clientId =
      event.clientId || req?.headers?.['x-client-id'] || req?.query?.clientId || null;

    if (!userId && !clientId) return null;

    const payload = {
      userId,
      clientId: clientId ? String(clientId).slice(0, 200) : null,
      actorType,
      type: event.type,
      meta: normalizeMeta(event.meta),
      ipHash: event.ipHash || hashIp(getClientIp(req)),
      userAgentFamily: event.userAgentFamily || userAgentFamily(req?.headers?.['user-agent'] || ''),
      isDemo: Boolean(event.isDemo),
      createdAt: event.createdAt ? new Date(event.createdAt) : new Date()
    };

    if (ActivityEvent.db && ActivityEvent.db.readyState === 1) {
      try {
        return await ActivityEvent.create(payload);
      } catch (dbErr) {
        console.warn(`[Activity] Mongo write failed: ${dbErr.message}`);
      }
    }

    const item = {
      _id: `mem_act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...payload
    };
    memoryEvents.push(item);
    if (memoryEvents.length > MAX_MEMORY_EVENTS) memoryEvents.shift();
    return item;
  } catch (err) {
    console.warn(`[Activity] record swallowed error: ${err.message}`);
    return null;
  }
}

/**
 * Fire-and-forget wrapper. Schedules the write and resolves immediately.
 */
function recordInBackground(event) {
  setImmediate(() => {
    record(event).catch(() => {});
  });
}

function isViewWindowDuplicate({ personId, docId, at = new Date(), events = memoryEvents, windowMs = VIEW_WINDOW_MS }) {
  const bucket = Math.floor(new Date(at).getTime() / windowMs);
  return events.some(
    (event) =>
      event.type === 'document_view' &&
      String(event.userId || event.clientId) === String(personId) &&
      String(event.meta?.docId) === String(docId) &&
      Math.floor(new Date(event.createdAt).getTime() / windowMs) === bucket
  );
}

function clearMemoryEvents() {
  memoryEvents.length = 0;
}

module.exports = {
  ACTIVITY_TYPES: ActivityEvent.ACTIVITY_TYPES,
  VIEW_WINDOW_MS,
  ActivityEvent,
  memoryEvents,
  record,
  recordInBackground,
  hashIp,
  userAgentFamily,
  normalizeMeta,
  isViewWindowDuplicate,
  clearMemoryEvents
};
