const request = require('supertest');

jest.mock('../../../models/Document', () => ({
  db: { readyState: 1 },
  findByIdAndDelete: jest.fn()
}));

const Document = require('../../../models/Document');
const app = require('../../../server');
const { generateToken } = require('../auth');

const token = generateToken({ id: 'admin_test', username: 'admin', role: 'superadmin' });

describe('DELETE /api/admin/documents/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).delete('/api/admin/documents/abc');
    expect(res.statusCode).toBe(401);
  });

  it('deletes an existing document and invalidates the cache', async () => {
    Document.findByIdAndDelete.mockResolvedValue({
      _id: 'abc',
      title: 'Exam Notice 2025.pdf',
      file_path: '/tmp/not-in-upload-dir.pdf'
    });

    const res = await request(app)
      .delete('/api/admin/documents/abc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, deletedId: 'abc' });
    expect(Document.findByIdAndDelete).toHaveBeenCalledWith('abc');
  });

  it('returns 404 for a missing document', async () => {
    Document.findByIdAndDelete.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/admin/documents/missing')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });
});
