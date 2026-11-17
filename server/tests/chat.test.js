const request = require('supertest');
const app = require('../server');

jest.mock('../services/nlpClient', () => ({
  nlpClient: {
    query: jest.fn().mockResolvedValue({
      answer: 'The exam schedule is available on the campus portal.',
      language: 'en',
      intent: 'exam_schedule',
      confidence: 0.95,
      source_doc: 'academic_calendar.pdf',
      entities: [],
      citations: [],
      grounded: true,
      decision: 'ANSWER'
    })
  }
}));

// Mock mongoose models in test to prevent buffering timeout
jest.mock('../models/Message', () => ({
  create: jest.fn().mockResolvedValue({ _id: 'mock_msg_123' })
}));

jest.mock('../models/Conversation', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue({})
}));

jest.mock('../features/f00_history', () => ({
  PersistentConversation: {
    findOneAndUpdate: jest.fn().mockResolvedValue({})
  },
  historyRouter: (req, res, next) => next()
}));

jest.mock('../features/f06_sessions', () => ({
  sessionManager: {
    getState: jest.fn().mockResolvedValue(null),
    updateState: jest.fn().mockResolvedValue({})
  }
}));

describe('Chat API Gateway Controller', () => {
  it('should return 400 if query is missing', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should fallback gracefully and return reply structure when query is valid', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ query: 'What is the exam schedule?' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body).toHaveProperty('detected_language');
  });
});



