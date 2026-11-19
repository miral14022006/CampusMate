const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const request = require('supertest');

const mockRecord = jest.fn();

jest.mock('../../f17_activity/activityService', () => ({
  recordInBackground: (...args) => mockRecord(...args)
}));

const mockFindChain = {
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn()
};

jest.mock('../../../models/Document', () => {
  const Model = {};
  Model.db = { readyState: 1 };
  Model.find = jest.fn(() => mockFindChain);
  Model.countDocuments = jest.fn();
  Model.distinct = jest.fn();
  Model.findById = jest.fn();
  Model.findOne = jest.fn();
  return Model;
});

const Document = require('../../../models/Document');
const documentRoutes = require('../documentRoutes');

const activeDoc = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Exam form notice',
  doc_type: 'notice',
  department: 'Examination Cell',
  effective_date: new Date('2026-11-01'),
  upload_date: new Date('2026-11-01'),
  version: 2,
  status: 'active',
  language: 'en',
  file_path: '/tmp/example.pdf',
  file_name: 'exam.pdf',
  original_name: 'exam.pdf',
  metadata: { page_count: 4 }
};

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/documents', documentRoutes);
  return instance;
}

describe('Feature 18 public document library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindChain.lean.mockResolvedValue([activeDoc]);
    Document.countDocuments.mockResolvedValue(1);
    Document.distinct.mockResolvedValue([]);
  });

  test('lists only active documents and exposes safe metadata', async () => {
    const res = await request(app()).get('/api/documents?search=exam&type=notice');
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.documents[0]).toMatchObject({
      id: String(activeDoc._id),
      title: activeDoc.title,
      version: 2,
      status: 'active',
      page_count: 4
    });
    expect(Document.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', doc_type: 'notice' }));
    expect(res.body.documents[0].file_path).toBeUndefined();
  });

  test('keeps a superseded version reachable and points to its replacement', async () => {
    const superseded = { ...activeDoc, status: 'superseded', version: 1 };
    const replacement = { _id: '507f1f77bcf86cd799439099', title: 'Exam form notice v2', version: 2 };
    Document.findById.mockResolvedValue(superseded);
    const replacementChain = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(replacement) };
    Document.findOne.mockReturnValue(replacementChain);

    const res = await request(app()).get(`/api/documents/${activeDoc._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.document.status).toBe('superseded');
    expect(res.body.document.superseded_by).toEqual(replacement);
    expect(Document.findOne).toHaveBeenCalledWith({ supersedes: superseded._id, status: 'active' });
  });

  test('streams the file and records a guest view without storing a user', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-doc-'));
    const file = path.join(dir, 'notice.txt');
    fs.writeFileSync(file, 'Campus notice text');
    Document.findById.mockResolvedValue({ ...activeDoc, file_path: file, file_name: 'notice.txt' });

    const res = await request(app())
      .get(`/api/documents/${activeDoc._id}/file?page=3`)
      .set('x-client-id', 'guest_123')
      .set('user-agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36');

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Campus notice text');
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    const event = mockRecord.mock.calls[0][0];
    expect(event.type).toBe('document_view');
    expect(event.meta).toMatchObject({ docId: String(activeDoc._id), page: 3 });
    expect(event.req.headers['x-client-id']).toBe('guest_123');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('records downloads as document_download', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-doc-'));
    const file = path.join(dir, 'notice.txt');
    fs.writeFileSync(file, 'Campus notice text');
    Document.findById.mockResolvedValue({ ...activeDoc, file_path: file, file_name: 'notice.txt' });

    const res = await request(app()).get(`/api/documents/${activeDoc._id}/file?download=1`);
    expect(res.statusCode).toBe(200);
    expect(mockRecord.mock.calls[0][0].type).toBe('document_download');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
