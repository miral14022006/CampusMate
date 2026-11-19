const {
  clearMemoryEvents,
  hashIp,
  isViewWindowDuplicate,
  memoryEvents,
  normalizeMeta,
  record,
  userAgentFamily,
  VIEW_WINDOW_MS
} = require('../activityService');

describe('Feature 17 activity tracker', () => {
  beforeEach(() => {
    clearMemoryEvents();
  });

  test('hashes IPs with a salted SHA-256 and never returns the raw value', () => {
    const raw = '203.0.113.42';
    const first = hashIp(raw);
    const second = hashIp(raw);
    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toContain(raw);
    expect(hashIp('198.51.100.7')).not.toBe(first);
  });

  test('parses browser and OS families without storing the user agent', () => {
    expect(userAgentFamily('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36')).toBe('Chrome / Windows');
    expect(userAgentFamily('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Safari/604.1')).toBe('Safari / iOS');
    expect(userAgentFamily('curl/8.0')).toBe('API / Unknown');
  });

  test('normalizes meta to the allow-list and drops unknown keys', () => {
    const meta = normalizeMeta({
      docId: 'doc_1',
      page: '12',
      intent: 'exam_form_deadline',
      language: 'hi',
      secret: 'should not be stored',
      path: 'x'.repeat(400)
    });
    expect(meta.docId).toBe('doc_1');
    expect(meta.page).toBe(12);
    expect(meta.intent).toBe('exam_form_deadline');
    expect(meta.secret).toBeUndefined();
    expect(meta.path).toHaveLength(300);
  });

  test('persists a guest event in memory when MongoDB is unavailable', async () => {
    const event = await record({
      type: 'document_view',
      clientId: 'guest_abc',
      meta: { docId: 'doc_1', page: 2 },
      ipHash: hashIp('127.0.0.1'),
      userAgentFamily: 'Chrome / macOS'
    });
    expect(event).not.toBeNull();
    expect(memoryEvents).toHaveLength(1);
    expect(memoryEvents[0].actorType).toBe('guest');
    expect(memoryEvents[0].meta.page).toBe(2);
  });

  test('ignores malformed events without throwing', async () => {
    await expect(record(null)).resolves.toBeNull();
    await expect(record({})).resolves.toBeNull();
    await expect(record({ type: 'page_view' })).resolves.toBeNull();
  });

  test('dedupes document views per person/document within a 30-minute window', () => {
    const at = new Date('2026-11-18T10:05:00Z');
    const first = {
      type: 'document_view',
      userId: 'student_1',
      meta: { docId: 'doc_1' },
      createdAt: at
    };
    expect(isViewWindowDuplicate({ personId: 'student_1', docId: 'doc_1', at: new Date('2026-11-18T10:29:59Z'), events: [first] })).toBe(true);
    expect(isViewWindowDuplicate({ personId: 'student_1', docId: 'doc_1', at: new Date('2026-11-18T10:30:00Z'), events: [first] })).toBe(false);
    expect(isViewWindowDuplicate({ personId: 'student_2', docId: 'doc_1', at, events: [first] })).toBe(false);
    expect(isViewWindowDuplicate({ personId: 'student_1', docId: 'doc_2', at, events: [first] })).toBe(false);
    expect(VIEW_WINDOW_MS).toBe(1800000);
  });
});
