const { SessionManager } = require('../sessionManager');

describe('Feature 06: SessionManager', () => {
  let sm;

  beforeEach(() => {
    sm = new SessionManager(null); // in-memory mode
  });

  test('saves and retrieves dialogue state across turns', async () => {
    const sessionId = 'test_sess_101';
    const state = {
      session_id: sessionId,
      last_intent: 'exam_timetable',
      slots: { course: 'B.Tech CS', semester: '3rd sem' }
    };

    await sm.saveState(sessionId, state);
    const retrieved = await sm.getState(sessionId);

    expect(retrieved).not.toBeNull();
    expect(retrieved.last_intent).toBe('exam_timetable');
    expect(retrieved.slots.course).toBe('B.Tech CS');
  });

  test('resets session state on resetState', async () => {
    const sessionId = 'test_sess_102';
    const state = {
      session_id: sessionId,
      last_intent: 'fee_payment_dates',
      slots: { course: 'MBA' }
    };

    await sm.saveState(sessionId, state);
    await sm.resetState(sessionId);
    const retrieved = await sm.getState(sessionId);

    expect(retrieved).toBeNull();
  });

  test('expires state after TTL has passed', async () => {
    const sessionId = 'test_sess_103';
    const state = { session_id: sessionId, last_intent: 'library_hours' };

    // Set with 0 second TTL (expired immediately)
    await sm.saveState(sessionId, state, -1);
    const retrieved = await sm.getState(sessionId);

    expect(retrieved).toBeNull();
  });
});

