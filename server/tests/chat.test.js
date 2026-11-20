const request = require('supertest');
const app = require('../server');

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

jest.mock('../features/f16_auth', () => {
  const express = require('express');
  return {
    requireAuth: (req, res, next) => {
      req.user = { id: 'mock_user_1', role: 'student', branch: 'Computer Engineering', semester: 4 };
      next();
    },
    optionalAuth: (req, res, next) => {
      req.user = { id: 'mock_user_1', role: 'student', branch: 'Computer Engineering', semester: 4 };
      next();
    },
    requireRole: (...roles) => (req, res, next) => next(),
    studentAuthRoutes: express.Router(),
    adminAuthRoutes: express.Router()
  };
});

describe('Chat API Gateway Controller', () => {
  it('should return 400 if query is missing', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return maintenance response when query is valid and RAG is disconnected', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .send({ query: 'What is the exam schedule?' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body.reply).toContain('CampusMate AI Assistant is undergoing scheduled maintenance');
    expect(res.body.generation_mode).toEqual('maintenance');
  });
});
