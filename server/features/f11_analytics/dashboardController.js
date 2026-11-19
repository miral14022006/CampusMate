const express = require('express');
const mongoose = require('mongoose');

const User = require('../../features/f16_auth/models/User');
const ActivityEvent = require('../f17_activity/models/ActivityEvent');
const { memoryEvents } = require('../f17_activity/activityService');
const Document = require('../../models/Document');
const PersistentConversation = require('../f00_history/conversationModel');
const Message = require('../../models/Message');
const QueryAnalyticsLog = require('../../models/QueryAnalyticsLog');
const Feedback = require('../../models/Feedback');
const { recordAuditLog } = require('../f16_auth/auditService');
const { serverCacheManager } = require('../f12_cache');
const {
  parseRange,
  previousRange,
  normalizeGranularity,
  demoMatch,
  buildActivityMatch,
  percentageChange,
  rate,
  calculateP95,
  maskEmail,
  maskName,
  identityFor,
  buildUniqueViewBuckets,
  buildActivitySummaryPipeline,
  buildTimeSeriesPipeline,
  buildHeatmapPipeline,
  buildTopIntentsPipeline,
  buildLanguagePipeline,
  buildDocumentUsagePipeline
} = require('./dashboardAggregations');

const router = express.Router();
const CACHE_TTL = Number(process.env.DASHBOARD_CACHE_SECONDS || 60);

function dbReady(model) {
  return model.db && model.db.readyState === 1;
}

function cacheKey(req, name) {
  const { from, to, granularity, semester, branch, includeDemo, ...rest } = req.query;
  const filters = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');
  return `dashboard:${name}:${from || ''}:${to || ''}:${granularity || 'day'}:${semester || 'all'}:${branch || 'all'}:${includeDemo || 'false'}:${filters}`;
}

async function withCache(req, name, loader) {
  const bust = req.query.bust === '1' || req.query.cacheBust === '1';
  const key = cacheKey(req, name);
  if (!bust) {
    const hit = await serverCacheManager.getRaw(key);
    if (hit) return { ...hit, cache: { hit: true, ttlSeconds: CACHE_TTL } };
  }
  const started = Date.now();
  const data = await loader();
  const payload = { ...data, executionTimeMs: Date.now() - started };
  await serverCacheManager.setRaw(key, payload, CACHE_TTL);
  return { ...payload, cache: { hit: false, ttlSeconds: CACHE_TTL } };
}

function dateFilters(req) {
  const range = parseRange(req.query.from, req.query.to);
  return {
    range,
    previous: previousRange(range.from, range.to),
    granularity: normalizeGranularity(req.query.granularity),
    semester: req.query.semester,
    branch: req.query.branch,
    includeDemo: req.query.includeDemo
  };
}

function queryLogDemoMatch(includeDemo) {
  if (includeDemo === 'only') return { isSeeded: true };
  if (includeDemo === 'true' || includeDemo === true) return {};
  return { isSeeded: { $ne: true } };
}

async function activityAggregate(match) {
  if (!dbReady(ActivityEvent)) {
    return summarizeMemoryEvents(match);
  }
  const rows = await ActivityEvent.aggregate(buildActivitySummaryPipeline(match));
  return rows[0] || emptySummary();
}

function emptySummary() {
  return {
    queries: 0,
    documentViews: 0,
    downloads: 0,
    calendarAdds: 0,
    signups: 0,
    activeStudents: 0,
    guestVisitors: 0,
    conversations: 0,
    viewers: 0
  };
}

function summarizeMemoryEvents(match) {
  const from = new Date(match.createdAt.$gte).getTime();
  const to = new Date(match.createdAt.$lte).getTime();
  const list = memoryEvents.filter((event) => {
    const at = new Date(event.createdAt).getTime();
    if (at < from || at > to) return false;
    if (match.type && event.type !== match.type) return false;
    if (match['meta.docId'] && String(event.meta?.docId) !== String(match['meta.docId'])) return false;
    return true;
  });
  const students = new Set();
  const guests = new Set();
  const conversations = new Set();
  const viewers = new Set();
  const summary = emptySummary();
  for (const event of list) {
    if (event.type === 'chat_query') summary.queries += 1;
    if (event.type === 'document_view') {
      summary.documentViews += 1;
      viewers.add(String(event.userId || event.clientId));
    }
    if (event.type === 'document_download') summary.downloads += 1;
    if (event.type === 'calendar_add') summary.calendarAdds += 1;
    if (event.type === 'signup') summary.signups += 1;
    if (event.actorType === 'student' && event.userId) students.add(String(event.userId));
    if (event.actorType === 'guest' && event.clientId) guests.add(String(event.clientId));
    if (event.meta?.conversationId) conversations.add(String(event.meta.conversationId));
  }
  summary.activeStudents = students.size;
  summary.guestVisitors = guests.size;
  summary.conversations = conversations.size;
  summary.viewers = viewers.size;
  return summary;
}

async function uniqueViewCount(range, includeDemo, docId) {
  if (!dbReady(ActivityEvent)) {
    return memoryEvents.filter((event) => {
      if (event.type !== 'document_view') return false;
      const at = new Date(event.createdAt).getTime();
      if (at < range.from.getTime() || at > range.to.getTime()) return false;
      if (docId && String(event.meta?.docId) !== String(docId)) return false;
      return true;
    }).length;
  }
  const rows = await ActivityEvent.aggregate(
    buildUniqueViewBuckets({ from: range.from, to: range.to, docId })
  );
  return rows[0]?.uniqueWindows || 0;
}

async function queryStats(range, includeDemo) {
  const match = {
    createdAt: { $gte: range.from, $lte: range.to },
    ...queryLogDemoMatch(includeDemo)
  };
  if (!dbReady(QueryAnalyticsLog)) {
    return { total: 0, fallback: 0, avgLatencyMs: 0, p95LatencyMs: 0 };
  }
  const rows = await QueryAnalyticsLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        fallback: { $sum: { $cond: [{ $eq: ['$isUnanswered', true] }, 1, 0] } },
        avgLatencyMs: { $avg: '$totalLatencyMs' },
        latencies: { $push: '$totalLatencyMs' }
      }
    }
  ]);
  const row = rows[0] || {};
  return {
    total: row.total || 0,
    fallback: row.fallback || 0,
    avgLatencyMs: Math.round(row.avgLatencyMs || 0),
    p95LatencyMs: Math.round(calculateP95(row.latencies || []))
  };
}

async function feedbackStats(range) {
  if (!dbReady(Feedback)) return { up: 0, down: 0 };
  const rows = await Feedback.aggregate([
    { $match: { createdAt: { $gte: range.from, $lte: range.to }, rating: { $in: ['up', 'down'] } } },
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ]);
  const up = rows.find((row) => row._id === 'up')?.count || 0;
  const down = rows.find((row) => row._id === 'down')?.count || 0;
  return { up, down };
}

async function semesterBreakdown(match) {
  if (!dbReady(ActivityEvent)) return [];
  return ActivityEvent.aggregate([
    { $match: { ...match, actorType: 'student', userId: { $ne: null } } },
    { $group: { _id: '$userId' } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { semester: '$user.semester', branch: '$user.branch' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        semester: '$_id.semester',
        branch: '$_id.branch',
        count: 1
      }
    }
  ]);
}

async function topDocuments(match, limit = 6) {
  if (!dbReady(ActivityEvent)) return [];
  const usage = await ActivityEvent.aggregate([
    ...buildDocumentUsagePipeline(match),
    { $limit: limit }
  ]);
  const ids = usage
    .map((row) => row._id)
    .filter((id) => mongoose.isValidObjectId(id));
  const docs = ids.length
    ? await Document.find({ _id: { $in: ids } }).select('title version status').lean()
    : [];
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
  return docs.length
    ? usage.map((row) => {
        const doc = byId.get(String(row._id));
        return {
          id: row._id,
          title: doc?.title || 'Unknown document',
          version: doc?.version || 1,
          status: doc?.status || 'unknown',
          views: row.views,
          downloads: row.downloads
        };
      })
    : [];
}

async function recentActivity(limit = 12, role = 'admin') {
  if (!dbReady(ActivityEvent)) {
    return memoryEvents
      .slice(-limit)
      .reverse()
      .map((event) => ({
        id: event._id,
        type: event.type,
        actorType: event.actorType,
        createdAt: event.createdAt,
        meta: event.meta
      }));
  }
  const rows = await ActivityEvent.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const ids = rows.map((row) => row.userId).filter(Boolean);
  const users = ids.length ? await User.find({ _id: { $in: ids } }).select('name email role').lean() : [];
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return rows.map((row) => ({
    id: String(row._id),
    type: row.type,
    actorType: row.actorType,
    createdAt: row.createdAt,
    userName: row.userId
      ? identityFor(byId.get(String(row.userId)) || { name: 'Student' }, role).name
      : null,
    meta: row.meta
  }));
}

async function buildOverview(req) {
  const { range, previous, granularity, semester, branch, includeDemo } = dateFilters(req);
  const match = buildActivityMatch({ ...range, semester, branch, includeDemo });
  const prevMatch = buildActivityMatch({ ...previous, semester, branch, includeDemo });

  const [
    summary,
    prevSummary,
    uniqueViews,
    prevUniqueViews,
    series,
    heatmap,
    intents,
    languages,
    feedback,
    prevFeedback,
    qStats,
    prevQStats,
    breakdown,
    docs,
    feed
  ] = await Promise.all([
    activityAggregate(match),
    activityAggregate(prevMatch),
    uniqueViewCount(range, includeDemo),
    uniqueViewCount(previous, includeDemo),
    dbReady(ActivityEvent)
      ? ActivityEvent.aggregate(buildTimeSeriesPipeline(match, granularity))
      : [],
    dbReady(ActivityEvent) ? ActivityEvent.aggregate(buildHeatmapPipeline(match)) : [],
    dbReady(ActivityEvent) ? ActivityEvent.aggregate(buildTopIntentsPipeline(match)) : [],
    dbReady(ActivityEvent) ? ActivityEvent.aggregate(buildLanguagePipeline(match)) : [],
    feedbackStats(range),
    feedbackStats(previous),
    queryStats(range, includeDemo),
    queryStats(previous, includeDemo),
    semesterBreakdown(match),
    topDocuments(match),
    recentActivity(12, req.user?.role)
  ]);

  const registered = dbReady(User)
    ? await User.countDocuments({ role: 'student', ...(includeDemo === 'only' ? { isDemo: true } : includeDemo === 'true' ? {} : { isDemo: { $ne: true } }) })
    : 0;
  const rated = feedback.up + feedback.down;
  const prevRated = prevFeedback.up + prevFeedback.down;
  const thumbsRate = rate(feedback.up, rated, 0);
  const prevThumbsRate = rate(prevFeedback.up, prevRated, 0);

  const kpis = {
    registeredStudents: { value: registered, previous: null, change: null },
    newSignups: {
      value: summary.signups,
      previous: prevSummary.signups,
      change: percentageChange(summary.signups, prevSummary.signups)
    },
    activeStudents: {
      value: summary.activeStudents,
      previous: prevSummary.activeStudents,
      change: percentageChange(summary.activeStudents, prevSummary.activeStudents)
    },
    guestVisitors: {
      value: summary.guestVisitors,
      previous: prevSummary.guestVisitors,
      change: percentageChange(summary.guestVisitors, prevSummary.guestVisitors)
    },
    conversations: {
      value: summary.conversations,
      previous: prevSummary.conversations,
      change: percentageChange(summary.conversations, prevSummary.conversations)
    },
    queries: {
      value: summary.queries,
      previous: prevSummary.queries,
      change: percentageChange(summary.queries, prevSummary.queries)
    },
    documentViews: {
      value: summary.documentViews,
      previous: prevSummary.documentViews,
      change: percentageChange(summary.documentViews, prevSummary.documentViews)
    },
    uniqueViewers: {
      value: summary.viewers,
      previous: prevSummary.viewers,
      change: percentageChange(summary.viewers, prevSummary.viewers)
    },
    uniqueViewWindows: {
      value: uniqueViews,
      previous: prevUniqueViews,
      change: percentageChange(uniqueViews, prevUniqueViews)
    },
    calendarAdds: {
      value: summary.calendarAdds,
      previous: prevSummary.calendarAdds,
      change: percentageChange(summary.calendarAdds, prevSummary.calendarAdds)
    },
    thumbsUpRate: { value: thumbsRate, previous: prevThumbsRate, change: Math.round((thumbsRate - prevThumbsRate) * 10) / 10, unit: '%' },
    fallbackRate: {
      value: rate(qStats.fallback, qStats.total, 0),
      previous: rate(prevQStats.fallback, prevQStats.total, 0),
      change: Math.round((rate(qStats.fallback, qStats.total) - rate(prevQStats.fallback, prevQStats.total)) * 10) / 10,
      unit: '%'
    },
    avgLatencyMs: {
      value: qStats.avgLatencyMs,
      previous: prevQStats.avgLatencyMs,
      change: percentageChange(qStats.avgLatencyMs, prevQStats.avgLatencyMs),
      unit: 'ms'
    },
    p95LatencyMs: {
      value: qStats.p95LatencyMs,
      previous: prevQStats.p95LatencyMs,
      change: percentageChange(qStats.p95LatencyMs, prevQStats.p95LatencyMs),
      unit: 'ms'
    }
  };

  return {
    range: { from: range.from, to: range.to, previousFrom: previous.from, previousTo: previous.to, granularity },
    kpis,
    timeSeries: series,
    heatmap,
    languages,
    topIntents: intents,
    topDocuments: docs,
    semesterBreakdown: breakdown,
    recentActivity: feed,
    includeDemo: includeDemo === 'true' || includeDemo === 'only'
  };
}

/**
 * GET /api/admin/dashboard/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const result = await withCache(req, 'overview', () => buildOverview(req));
    return res.json(result);
  } catch (err) {
    console.error(`[Dashboard overview] ${err.message}`);
    return res.status(500).json({ error: 'Could not build the dashboard overview.' });
  }
});

function studentQuery(req) {
  const { range, semester, branch, includeDemo } = dateFilters(req);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const sortKey = ['joined', 'lastActive', 'queries', 'views', 'conversations', 'name'].includes(req.query.sort)
    ? req.query.sort
    : 'lastActive';
  const sortDir = req.query.dir === 'asc' ? 1 : -1;
  const search = String(req.query.search || '').trim();
  const status = req.query.status || 'all';

  const match = {
    role: 'student',
    ...(includeDemo === 'only' ? { isDemo: true } : includeDemo === 'true' ? {} : { isDemo: { $ne: true } })
  };
  if (semester && semester !== 'all') match.semester = Number(semester);
  if (branch && branch !== 'all') match.branch = branch;
  if (status !== 'all') match.status = status;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ name: rx }, { email: rx }];
  }

  const sortField = {
    joined: 'createdAt',
    lastActive: 'lastActive',
    queries: 'queries',
    views: 'docViews',
    conversations: 'conversations',
    name: 'name'
  }[sortKey];

  const sort = { [sortField]: sortDir, _id: 1 };
  return { match, range, page, limit, sort, search, status };
}

async function listStudents(req) {
  const { match, range, page, limit, sort } = studentQuery(req);
  if (!dbReady(User)) return { students: [], total: 0, page, pages: 0 };

  const activityMatch = {
    createdAt: { $gte: range.from, $lte: range.to }
  };
  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'activityevents',
        let: { uid: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$uid'] }, ...activityMatch } },
          {
            $group: {
              _id: null,
              lastActive: { $max: '$createdAt' },
              queries: { $sum: { $cond: [{ $eq: ['$type', 'chat_query'] }, 1, 0] } },
              docViews: { $sum: { $cond: [{ $eq: ['$type', 'document_view'] }, 1, 0] } },
              conversations: { $addToSet: '$meta.conversationId' }
            }
          },
          {
            $project: {
              _id: 0,
              lastActive: 1,
              queries: 1,
              docViews: 1,
              conversations: { $size: { $setDifference: ['$conversations', [null]] } }
            }
          }
        ],
        as: 'usage'
      }
    },
    {
      $addFields: {
        usage: { $ifNull: [{ $first: '$usage' }, {}] }
      }
    },
    {
      $project: {
        id: { $toString: '$_id' },
        name: 1,
        email: 1,
        semester: 1,
        branch: 1,
        status: 1,
        createdAt: 1,
        lastActive: { $ifNull: ['$usage.lastActive', null] },
        queries: { $ifNull: ['$usage.queries', 0] },
        docViews: { $ifNull: ['$usage.docViews', 0] },
        conversations: { $ifNull: ['$usage.conversations', 0] }
      }
    },
    { $sort: sort },
    { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } }
  ];

  const result = await User.aggregate(pipeline);
  const rows = result[0]?.data || [];
  const total = result[0]?.meta?.[0]?.total || 0;
  const role = req.user?.role;
  return {
    students: rows.map((row) => ({ ...row, ...identityFor(row, role) })),
    total,
    page,
    pages: Math.ceil(total / limit),
    sort: req.query.sort || 'lastActive',
    dir: req.query.dir || 'desc'
  };
}

router.get('/students', async (req, res) => {
  try {
    return res.json(await withCache(req, 'students', () => listStudents(req)));
  } catch (err) {
    console.error(`[Dashboard students] ${err.message}`);
    return res.status(500).json({ error: 'Could not load students.' });
  }
});

router.get('/students/:id/usage', async (req, res) => {
  try {
    const role = req.user?.role;
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid student id.' });
    const user = await User.findOne({ _id: req.params.id, role: 'student' }).lean();
    if (!user) return res.status(404).json({ error: 'Student not found.' });

    const { range } = dateFilters(req);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const match = { userId: user._id, createdAt: { $gte: range.from, $lte: range.to } };

    const [daily, docs, intents, timeline, timelineCount] = await Promise.all([
      ActivityEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            events: { $sum: 1 },
            queries: { $sum: { $cond: [{ $eq: ['$type', 'chat_query'] }, 1, 0] } },
            documentViews: { $sum: { $cond: [{ $eq: ['$type', 'document_view'] }, 1, 0] } }
          }
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', events: 1, queries: 1, documentViews: 1 } }
      ]),
      ActivityEvent.aggregate([
        { $match: { ...match, type: 'document_view' } },
        { $group: { _id: '$meta.docId', views: { $sum: 1 }, lastViewed: { $max: '$createdAt' } } },
        { $sort: { views: -1 } },
        { $limit: 20 }
      ]),
      ActivityEvent.aggregate([
        { $match: { ...match, type: 'chat_query' } },
        { $group: { _id: '$meta.intent', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      ActivityEvent.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ActivityEvent.countDocuments(match)
    ]);

    const docIds = docs.map((row) => row._id).filter((id) => mongoose.isValidObjectId(id));
    const docInfo = docIds.length ? await Document.find({ _id: { $in: docIds } }).select('title version').lean() : [];
    const byId = new Map(docInfo.map((doc) => [String(doc._id), doc]));

    return res.json({
      student: {
        id: String(user._id),
        ...identityFor(user, role),
        role: user.role,
        semester: user.semester,
        branch: user.branch,
        status: user.status,
        joined: user.createdAt,
        lastActive: user.lastLoginAt
      },
      daily,
      documents: docs.map((row) => ({
        id: row._id,
        title: byId.get(String(row._id))?.title || 'Unknown document',
        views: row.views,
        lastViewed: row.lastViewed
      })),
      intents: intents.map((row) => ({ intent: row._id || 'unknown', count: row.count })),
      timeline: timeline.map(sanitizeEvent),
      timelinePage: { page, pages: Math.ceil(timelineCount / limit), total: timelineCount }
    });
  } catch (err) {
    console.error(`[Dashboard student usage] ${err.message}`);
    return res.status(500).json({ error: 'Could not load student usage.' });
  }
});

router.patch('/students/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or disabled.' });
    }
    const user = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!user) return res.status(404).json({ error: 'Student not found.' });
    user.status = status;
    await user.save();
    await recordAuditLog({
      actorId: req.user?._id,
      action: status === 'disabled' ? 'student_disabled' : 'student_enabled',
      targetType: 'User',
      targetId: user._id,
      meta: { email: user.email },
      req
    });
    await serverCacheManager.setRaw('dashboard-bust', { at: Date.now() }, 1);
    return res.json({ success: true, status: user.status });
  } catch (err) {
    return res.status(500).json({ error: 'Could not update student status.' });
  }
});

function sanitizeEvent(event) {
  return {
    id: String(event._id),
    type: event.type,
    actorType: event.actorType,
    userId: event.userId ? String(event.userId) : null,
    clientId: event.clientId,
    meta: event.meta || {},
    userAgentFamily: event.userAgentFamily,
    createdAt: event.createdAt
  };
}

async function buildDocuments(req) {
  const { range } = dateFilters(req);
  if (!dbReady(Document)) return { documents: [] };
  const docs = await Document.find({}).select('title version status doc_type department file_name original_name upload_date effective_date').lean();
  const usage = dbReady(ActivityEvent)
    ? await ActivityEvent.aggregate(buildDocumentUsagePipeline(buildActivityMatch({ ...range, includeDemo: req.query.includeDemo })))
    : [];
  const usageById = new Map(usage.map((row) => [String(row._id), row]));

  const citationRows = dbReady(QueryAnalyticsLog)
    ? await QueryAnalyticsLog.aggregate([
        { $match: { createdAt: { $gte: range.from, $lte: range.to }, sourceDoc: { $ne: null } } },
        { $group: { _id: '$sourceDoc', count: { $sum: 1 } } }
      ])
    : [];
  const citations = new Map(citationRows.map((row) => [String(row._id), row.count]));

  const items = docs.map((doc) => {
    const row = usageById.get(String(doc._id)) || {};
    const key = doc.file_name || doc.original_name || doc.title;
    const pages = (row.pages || []).filter((page) => page !== null && page !== undefined);
    const counts = pages.reduce((acc, page) => {
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {});
    return {
      id: String(doc._id),
      title: doc.title,
      version: doc.version,
      status: doc.status,
      type: doc.doc_type,
      department: doc.department,
      views: row.views || 0,
      downloads: row.downloads || 0,
      uniqueViewers: 0,
      lastViewed: row.lastViewed || null,
      topPages: Object.entries(counts)
        .map(([page, count]) => ({ page: Number(page), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      citations: citations.get(key) || citations.get(doc.original_name) || 0
    };
  });

  // Unique viewer counts need the window-aware dedupe per document.
  if (dbReady(ActivityEvent)) {
    const uniqueRows = await ActivityEvent.aggregate([
      { $match: buildActivityMatch({ ...range, includeDemo: req.query.includeDemo, extra: { type: 'document_view' } }) },
      {
        $addFields: {
          personKey: { $ifNull: ['$userId', '$clientId'] },
          bucket: {
            $subtract: [{ $toLong: '$createdAt' }, { $mod: [{ $toLong: '$createdAt' }, 30 * 60 * 1000] }]
          }
        }
      },
      { $group: { _id: { docId: '$meta.docId', person: '$personKey', bucket: '$bucket' } } },
      { $group: { _id: '$_id.docId', uniqueViewers: { $sum: 1 } } }
    ]);
    const uniqueById = new Map(uniqueRows.map((row) => [String(row._id), row.uniqueViewers]));
    items.forEach((item) => {
      item.uniqueViewers = uniqueById.get(String(item.id)) || 0;
    });
  }

  const selectedId = req.query.id;
  let series = [];
  let topPages = [];
  if (selectedId) {
    const doc = items.find((item) => String(item.id) === String(selectedId));
    series = dbReady(ActivityEvent)
      ? await ActivityEvent.aggregate([
          {
            $match: buildActivityMatch({
              ...range,
              includeDemo: req.query.includeDemo,
              extra: { type: 'document_view', 'meta.docId': String(selectedId) }
            })
          },
          {
            $group: {
              _id: { $dateToString: { format: granularityFormatSafe(req.query.granularity), date: '$createdAt' } },
              views: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', views: 1 } }
        ])
      : [];
    topPages = doc?.topPages || [];
  }

  return {
    documents: items.sort((a, b) => b.views - a.views),
    selected: selectedId || null,
    series,
    topPages
  };
}

function granularityFormatSafe(granularity) {
  if (granularity === 'hour') return '%Y-%m-%dT%H:00:00.000Z';
  if (granularity === 'week') return '%G-W%V';
  return '%Y-%m-%d';
}

router.get('/documents', async (req, res) => {
  try {
    return res.json(await withCache(req, 'documents', () => buildDocuments(req)));
  } catch (err) {
    console.error(`[Dashboard documents] ${err.message}`);
    return res.status(500).json({ error: 'Could not load document usage.' });
  }
});

async function buildChats(req) {
  const { range, includeDemo } = dateFilters(req);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = String(req.query.search || '').trim();
  const match = {
    updatedAt: { $gte: range.from, $lte: range.to },
    ...(includeDemo === 'only' ? { isDemo: true } : includeDemo === 'true' ? {} : { isDemo: { $ne: true } })
  };
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ title: rx }, { lastMessagePreview: rx }];
  }

  const filters = [];
  if (req.query.language && req.query.language !== 'all') filters.push({ language: req.query.language });
  if (req.query.intent && req.query.intent !== 'all') filters.push({ intent: req.query.intent });
  if (req.query.fallback === 'true' || req.query.fallback === true) filters.push({ fallback: true });
  if (req.query.feedback && req.query.feedback !== 'all') {
    filters.push(
      req.query.feedback === 'none'
        ? { feedback: null }
        : { 'feedback.rating': req.query.feedback }
    );
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'queryanalyticlogs',
        localField: 'sessionId',
        foreignField: 'sessionId',
        as: 'analytics'
      }
    },
    {
      $addFields: {
        language: { $ifNull: [{ $first: '$analytics.language' }, { $ifNull: ['$dominantLanguage', 'unknown'] }] },
        intent: { $ifNull: [{ $first: '$analytics.intent' }, 'unknown'] },
        fallback: { $gt: [{ $size: { $filter: { input: '$analytics', as: 'a', cond: { $eq: ['$$a.isUnanswered', true] } } } }, 0] },
        feedback: { $ifNull: [{ $first: { $filter: { input: '$analytics', as: 'a', cond: { $ne: ['$$a.rating', null] } } } }, null] }
      }
    },
    ...(filters.length ? [{ $match: { $and: filters } }] : []),
    { $sort: { updatedAt: -1 } },
    { $facet: { data: [{ $skip: (page - 1) * limit }, { $limit: limit }], meta: [{ $count: 'total' }] } }
  ];

  const result = dbReady(PersistentConversation)
    ? await PersistentConversation.aggregate(pipeline)
    : [[{ data: [], meta: [] }]];
  const rows = result[0]?.data || [];
  const total = result[0]?.meta?.[0]?.total || 0;

  const userIds = rows.map((row) => row.userId).filter((id) => mongoose.isValidObjectId(id));
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }).select('name email role').lean() : [];
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const role = req.user?.role;

  return {
    chats: rows.map((row) => {
      const user = row.userId ? byId.get(String(row.userId)) : null;
      return {
        id: String(row._id),
        sessionId: row.sessionId,
        title: row.title,
        preview: row.lastMessagePreview,
        messageCount: row.messageCount,
        language: row.language,
        intent: row.intent,
        fallback: row.fallback,
        feedback: row.feedback?.rating || null,
        updatedAt: row.updatedAt,
        identity: user ? identityFor(user, role) : { name: 'Guest', email: '' }
      };
    }),
    total,
    page,
    pages: Math.ceil(total / limit)
  };
}

router.get('/chats', async (req, res) => {
  try {
    return res.json(await withCache(req, 'chats', () => buildChats(req)));
  } catch (err) {
    console.error(`[Dashboard chats] ${err.message}`);
    return res.status(500).json({ error: 'Could not load conversations.' });
  }
});

async function sendChatsCsv(req, res) {
  try {
    req.query.limit = 100;
    req.query.page = 1;
    const result = await buildChats(req);
    const isSuper = req.user?.role === 'superadmin';
    const headers = isSuper
      ? ['Conversation', 'Student', 'Email', 'Language', 'Intent', 'Fallback', 'Feedback', 'Messages', 'Updated']
      : ['Conversation', 'Language', 'Intent', 'Fallback', 'Feedback', 'Messages', 'Updated'];
    const rows = result.chats.map((chat) =>
      isSuper
        ? [chat.title, chat.identity.name, chat.identity.email, chat.language, chat.intent, chat.fallback, chat.feedback, chat.messageCount, chat.updatedAt]
        : [chat.title, chat.language, chat.intent, chat.fallback, chat.feedback, chat.messageCount, chat.updatedAt]
    );
    return sendCsv(res, 'chats.csv', toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ error: 'Could not export chats.' });
  }
}

router.get('/chats/:id', async (req, res) => {
  if (req.params.id === 'export') return sendChatsCsv(req, res);
  try {
    if (!dbReady(PersistentConversation)) return res.status(404).json({ error: 'Conversation not found.' });
    const conversation = await PersistentConversation.findOne({ sessionId: req.params.id }).lean()
      || (mongoose.isValidObjectId(req.params.id)
        ? await PersistentConversation.findById(req.params.id).lean()
        : null);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });

    await recordAuditLog({
      actorId: req.user?._id,
      action: 'chat_transcript_viewed',
      targetType: 'Conversation',
      targetId: conversation.sessionId,
      meta: { sessionId: conversation.sessionId },
      req
    });

    const messages = await Message.find({ sessionId: conversation.sessionId }).sort({ createdAt: 1 }).lean();
    const user = conversation.userId && mongoose.isValidObjectId(conversation.userId)
      ? await User.findById(conversation.userId).select('name email role').lean()
      : null;

    return res.json({
      transcript: {
        id: String(conversation._id),
        sessionId: conversation.sessionId,
        title: conversation.title,
        identity: user ? identityFor(user, req.user?.role) : { name: 'Guest', email: '' },
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: messages.map((message) => ({
          id: String(message._id),
          sender: message.sender,
          text: message.text,
          language: message.language,
          intent: message.intent,
          confidence: message.confidence,
          sourceDoc: message.sourceDoc,
          entities: message.entities || [],
          calendarEvents: message.calendarEvents || [],
          createdAt: message.createdAt
        }))
      },
      auditLogged: true
    });
  } catch (err) {
    console.error(`[Dashboard transcript] ${err.message}`);
    return res.status(500).json({ error: 'Could not open this transcript.' });
  }
});

function activityFilter(req) {
  const { range } = dateFilters(req);
  const filter = { createdAt: { $gte: range.from, $lte: range.to } };
  if (req.query.type && req.query.type !== 'all') filter.type = req.query.type;
  if (req.query.student && mongoose.isValidObjectId(req.query.student)) filter.userId = req.query.student;
  if (req.query.actorType && req.query.actorType !== 'all') filter.actorType = req.query.actorType;
  if (req.query.clientId) filter.clientId = req.query.clientId;
  if (req.query.includeDemo !== 'true' && req.query.includeDemo !== 'only') filter.isDemo = { $ne: true };
  return filter;
}

async function listActivity(req) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = activityFilter(req);
  if (!dbReady(ActivityEvent)) {
    const list = memoryEvents
      .filter((event) => {
        const at = new Date(event.createdAt).getTime();
        if (at < filter.createdAt.$gte.getTime() || at > filter.createdAt.$lte.getTime()) return false;
        if (filter.type && event.type !== filter.type) return false;
        return true;
      })
      .slice()
      .reverse();
    return { events: list.slice((page - 1) * limit, page * limit).map(sanitizeEvent), total: list.length, page, pages: Math.ceil(list.length / limit) };
  }
  const [events, total] = await Promise.all([
    ActivityEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityEvent.countDocuments(filter)
  ]);
  return { events: events.map(sanitizeEvent), total, page, pages: Math.ceil(total / limit) };
}

router.get('/activity', async (req, res) => {
  try {
    return res.json(await withCache(req, 'activity', () => listActivity(req)));
  } catch (err) {
    console.error(`[Dashboard activity] ${err.message}`);
    return res.status(500).json({ error: 'Could not load the activity stream.' });
  }
});

/* ------------------------------------------------------------------ exports */

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(headers, rows) {
  return [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
}

function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

router.get('/students/export', async (req, res) => {
  try {
    req.query.limit = 100;
    req.query.page = 1;
    const result = await listStudents(req);
    const isSuper = req.user?.role === 'superadmin';
    const headers = isSuper
      ? ['Name', 'Email', 'Semester', 'Branch', 'Status', 'Joined', 'Last active', 'Queries', 'Document views', 'Conversations']
      : ['Student ID', 'Semester', 'Branch', 'Status', 'Joined', 'Last active', 'Queries', 'Document views', 'Conversations'];
    const rows = result.students.map((student) =>
      isSuper
        ? [student.name, student.email, student.semester, student.branch, student.status, student.createdAt, student.lastActive, student.queries, student.docViews, student.conversations]
        : [student.id, student.semester, student.branch, student.status, student.createdAt, student.lastActive, student.queries, student.docViews, student.conversations]
    );
    return sendCsv(res, 'students.csv', toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ error: 'Could not export students.' });
  }
});

router.get('/documents/export', async (req, res) => {
  try {
    const result = await buildDocuments(req);
    const headers = ['Document ID', 'Title', 'Version', 'Status', 'Type', 'Department', 'Views', 'Unique viewers', 'Downloads', 'Citations', 'Last viewed'];
    const rows = result.documents.map((doc) => [doc.id, doc.title, doc.version, doc.status, doc.type, doc.department, doc.views, doc.uniqueViewers, doc.downloads, doc.citations, doc.lastViewed]);
    return sendCsv(res, 'documents-usage.csv', toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ error: 'Could not export documents.' });
  }
});

router.get('/chats/export', sendChatsCsv);

router.get('/activity/export', async (req, res) => {
  try {
    const filter = activityFilter(req);
    const events = dbReady(ActivityEvent)
      ? await ActivityEvent.find(filter).sort({ createdAt: -1 }).limit(5000).lean()
      : memoryEvents.slice(-5000);
    const headers = ['Time', 'Type', 'Actor', 'User', 'Client', 'Document', 'Page', 'Conversation', 'Intent', 'Language'];
    const rows = events.map((event) => [
      event.createdAt,
      event.type,
      event.actorType,
      event.userId || '',
      event.clientId || '',
      event.meta?.docId || '',
      event.meta?.page || '',
      event.meta?.conversationId || '',
      event.meta?.intent || '',
      event.meta?.language || ''
    ]);
    return sendCsv(res, 'activity.csv', toCsv(headers, rows));
  } catch (err) {
    return res.status(500).json({ error: 'Could not export activity.' });
  }
});

module.exports = {
  router,
  buildOverview,
  listStudents,
  listActivity,
  buildChats,
  buildDocuments,
  toCsv,
  csvEscape
};
