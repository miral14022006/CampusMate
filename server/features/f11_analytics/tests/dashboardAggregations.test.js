const {
  buildActivityMatch,
  buildUniqueViewBuckets,
  calculateP95,
  demoMatch,
  identityFor,
  maskEmail,
  maskName,
  percentageChange,
  rate,
  uniqueViewWindows,
  VIEW_WINDOW_MS
} = require('../dashboardAggregations');

describe('Feature 11 dashboard aggregation helpers', () => {
  test('calculates percentage change safely', () => {
    expect(percentageChange(120, 100)).toBe(20);
    expect(percentageChange(80, 100)).toBe(-20);
    expect(percentageChange(0, 0)).toBe(0);
    expect(percentageChange(5, 0)).toBe(100);
  });

  test('calculates rates and p95 latency', () => {
    expect(rate(1, 4)).toBe(25);
    expect(rate(0, 0, 0)).toBe(0);
    expect(calculateP95([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBe(100);
    expect(calculateP95([])).toBe(0);
  });

  test('masks names and emails for admins but not superadmins', () => {
    expect(maskName('Ananya Patel')).toBe('A*** P***');
    expect(maskEmail('ananya.patel@pdeu.ac.in')).toBe('an***@pdeu.ac.in');
    expect(identityFor({ name: 'Ananya Patel', email: 'ananya.patel@pdeu.ac.in' }, 'admin')).toEqual({
      name: 'A*** P***',
      email: 'an***@pdeu.ac.in'
    });
    expect(identityFor({ name: 'Ananya Patel', email: 'ananya.patel@pdeu.ac.in' }, 'superadmin')).toEqual({
      name: 'Ananya Patel',
      email: 'ananya.patel@pdeu.ac.in'
    });
  });

  test('demo data filters include, exclude and only modes', () => {
    expect(demoMatch(undefined)).toEqual({ isDemo: { $ne: true } });
    expect(demoMatch('true')).toEqual({ isDemo: { $ne: true } });
    expect(demoMatch('only')).toEqual({ isDemo: { $ne: true } });
    const match = buildActivityMatch({
      from: new Date('2026-01-01'),
      to: new Date('2026-01-31'),
      includeDemo: 'false',
      semester: '3',
      branch: 'Computer Engineering',
      extra: { type: 'chat_query' }
    });
    expect(match.type).toBe('chat_query');
    expect(match['meta.semester']).toBe(3);
    expect(match['meta.branch']).toBe('Computer Engineering');
  });

  test('counts unique view windows per person and document in 30-minute buckets', () => {
    const at = new Date('2026-11-18T10:05:00Z');
    const events = [
      { type: 'document_view', userId: 'a', createdAt: at, meta: { docId: 'doc_1' } },
      { type: 'document_view', userId: 'a', createdAt: new Date('2026-11-18T10:12:00Z'), meta: { docId: 'doc_1' } },
      { type: 'document_view', userId: 'b', createdAt: new Date('2026-11-18T10:20:00Z'), meta: { docId: 'doc_1' } },
      { type: 'document_view', userId: 'a', createdAt: new Date('2026-11-18T10:35:00Z'), meta: { docId: 'doc_1' } },
      { type: 'document_view', userId: 'a', createdAt: at, meta: { docId: 'doc_2' } },
      { type: 'document_download', userId: 'a', createdAt: at, meta: { docId: 'doc_1' } }
    ];
    expect(uniqueViewWindows(events)).toBe(4);
    expect(uniqueViewWindows(events, { docId: 'doc_1' })).toBe(3);
    expect(uniqueViewWindows([], { docId: 'doc_1' })).toBe(0);
    expect(VIEW_WINDOW_MS).toBe(1800000);
  });

  test('builds a window-aware unique view pipeline', () => {
    const pipeline = buildUniqueViewBuckets({
      from: new Date('2026-11-01'),
      to: new Date('2026-11-18'),
      docId: 'doc_1'
    });
    expect(pipeline[0].$match.type).toBe('document_view');
    expect(pipeline[0].$match['meta.docId']).toBe('doc_1');
    expect(pipeline[pipeline.length - 1]).toEqual({ $count: 'uniqueWindows' });
  });
});
