const request = require('supertest');

// Mock CalendarEvent before requiring server
jest.mock('../../../models/CalendarEvent', () => {
  const mockEvent = {
    _id: 'cal_event_1',
    title: 'End Sem Exam',
    titles: { en: 'End Sem Exam', hi: 'सत्र अंत परीक्षा', gu: 'સેમેસ્ટર અંત પરીક્ષા' },
    category: 'exam',
    startDate: new Date('2026-12-05T00:00:00Z'),
    endDate: new Date('2026-12-05T00:00:00Z'),
    allDay: true,
    description: 'B.Tech final examination schedule',
    uid: 'cm_exam_123@campusmate.pdeu.ac.in',
    sequence: 0,
    status: 'approved',
    toObject: function () {
      return {
        _id: this._id,
        title: this.title,
        titles: this.titles,
        category: this.category,
        startDate: this.startDate,
        endDate: this.endDate,
        allDay: this.allDay,
        description: this.description,
        uid: this.uid,
        sequence: this.sequence,
        status: this.status
      };
    }
  };

  const Model = function (data) {
    Object.assign(this, mockEvent, data);
    this.save = jest.fn().mockResolvedValue(this);
    this.toObject = mockEvent.toObject;
  };

  const sortMock = jest.fn().mockImplementation(() => {
    const p = Promise.resolve([mockEvent]);
    p.skip = jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue([mockEvent])
    });
    return p;
  });

  Model.find = jest.fn().mockReturnValue({
    sort: sortMock
  });
  Model.findOne = jest.fn().mockResolvedValue(mockEvent);
  Model.findByIdAndUpdate = jest.fn().mockImplementation((id, update) => {
    return Promise.resolve({ ...mockEvent, ...update.$set });
  });
  Model.countDocuments = jest.fn().mockResolvedValue(1);

  return Model;
});

const app = require('../../../server');
const { buildIcsFeed, buildGoogleCalendarUrl } = require('../../../services/icsBuilder');
const { generateToken } = require('../../f08_admin/auth');

describe('Feature 15: Calendar and Events API Tests', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken({ id: 'admin1', username: 'admin', role: 'admin' });
  });

  describe('ICS Builder Unit Tests', () => {
    test('ICS formatting includes CRLF, proper DTEND for all-day events, and alarms', () => {
      const event = {
        title: 'End Sem Exam Final Test',
        category: 'exam',
        startDate: new Date('2026-12-05T00:00:00Z'),
        endDate: new Date('2026-12-05T00:00:00Z'),
        allDay: true,
        description: 'End semester examination for B.Tech ICT',
        uid: 'cm_test123@campusmate.pdeu.ac.in',
        sequence: 1
      };

      const ics = buildIcsFeed([event], 'CampusMate Calendar');

      // Must contain CRLF (\r\n) line endings
      expect(ics).toContain('\r\n');
      // Must contain standard RFC headers
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('UID:cm_test123@campusmate.pdeu.ac.in');
      expect(ics).toContain('SEQUENCE:1');

      // All day start date should be VALUE=DATE:20261205
      expect(ics).toContain('DTSTART;VALUE=DATE:20261205');
      // All day DTEND next day exclusive (+1 day -> 20261206)
      expect(ics).toContain('DTEND;VALUE=DATE:20261206');

      expect(ics).toContain('VALARM');
      expect(ics).toContain('TRIGGER;RELATED=END:P1D');
      expect(ics).toContain('TRIGGER;RELATED=END:P3D');
    });

    test('ICS builder handles multilingual UTF-8 titles (Hindi and Gujarati)', () => {
      const event = {
        title: 'Exam Notice / પરીક્ષા જાહેરાત',
        titles: {
          en: 'Exam Notice',
          hi: 'परीक्षा सूचना',
          gu: 'પરીક્ષા જાહેરાત'
        },
        category: 'fee',
        startDate: new Date('2026-11-25T09:00:00Z'),
        endDate: new Date('2026-11-25T17:00:00Z'),
        allDay: false,
        description: 'Semester notice details',
        uid: 'cm_multi@campusmate.pdeu.ac.in',
        sequence: 0
      };

      const ics = buildIcsFeed([event]);
      expect(ics).toContain('SUMMARY:Exam Notice');
      expect(ics).toContain('DTSTART;TZID=Asia/Kolkata:20261125T143000');
    });

    test('Google Calendar URL encoding preserves text and sets dates', () => {
      const event = {
        title: 'Fee Payment Last Date',
        titles: {
          en: 'Fee Payment Last Date',
          hi: 'फीस भरने की अंतिम तारीख',
          gu: 'પરીક્ષા ફી ભરવાની છેલ્લી તારીખ'
        },
        category: 'fee',
        startDate: new Date('2026-11-25T00:00:00Z'),
        endDate: new Date('2026-11-25T00:00:00Z'),
        allDay: true,
        description: 'Details for student fee deadline'
      };

      const url = buildGoogleCalendarUrl(event);
      expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
      expect(url).toContain('Fee+Payment+Last+Date');
      // Exclusive end date (+1 day -> 20261126)
      expect(url).toContain('dates=20261125%2F20261126');
    });
  });

  describe('Calendar API Endpoints Integration', () => {
    test('GET /api/calendar/events returns empty or approved events array', async () => {
      const res = await request(app).get('/api/calendar/events');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    test('GET /api/calendar/feed.ics returns valid text/calendar content', async () => {
      const res = await request(app).get('/api/calendar/feed.ics');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/calendar/);
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('END:VCALENDAR');
    });

    test('POST /api/calendar/ics without event_ids returns 400', async () => {
      const res = await request(app).post('/api/calendar/ics').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('Admin calendar endpoints require authorization token', async () => {
      const unauth = await request(app).get('/api/calendar/admin/events');
      expect(unauth.statusCode).toBe(401);

      const auth = await request(app)
        .get('/api/calendar/admin/events')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auth.statusCode).toBe(200);
      expect(auth.body.events).toBeDefined();
    });

    test('POST /api/calendar/admin/events creates a manual event', async () => {
      const payload = {
        title: 'Manual Convocation 2026',
        category: 'other',
        startDate: '2026-12-15',
        endDate: '2026-12-15',
        allDay: true,
        description: 'Annual convocation ceremony'
      };

      const res = await request(app)
        .post('/api/calendar/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.event.status).toBe('approved');
      expect(res.body.event.uid).toBeDefined();
    });

    test('PUT /api/calendar/admin/events/:id/approve updates event to approved', async () => {
      const res = await request(app)
        .put('/api/calendar/admin/events/cal_event_1/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.event.status).toBe('approved');
    });

    test('PUT /api/calendar/admin/events/:id/reject updates event to rejected', async () => {
      const res = await request(app)
        .put('/api/calendar/admin/events/cal_event_1/reject')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.event.status).toBe('rejected');
    });
  });
});
