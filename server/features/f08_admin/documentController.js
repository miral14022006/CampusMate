const express = require('express');
const bcrypt = require('bcryptjs');
const AdminUser = require('../../models/AdminUser');
const Document = require('../../models/Document');
const { generateToken, requireAdminAuth } = require('./auth');
const { upload, calculateChecksum } = require('./uploadMiddleware');
const { serverCacheManager } = require('../f12_cache');
const { recordAuditLog } = require('../f16_auth/auditService');

const router = express.Router();

/**
 * POST /api/admin/login
 * Admin credentials authentication generating signed JWT
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    let user = null;
    if (AdminUser.db && AdminUser.db.readyState === 1) {
      user = await AdminUser.findOne({ username });
    }

    // Default built-in credentials fallback if DB not seeded
    if (!user) {
      if (username === 'admin' && (password === 'Admin@123' || password === 'admin123')) {
        const token = generateToken({ id: 'admin_root', username: 'admin', role: 'superadmin' });
        return res.json({
          token,
          user: { username: 'admin', role: 'superadmin', name: 'Campus Superadmin' }
        });
      }
      return res.status(401).json({ error: 'Invalid administrative credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid administrative credentials.' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role, name: user.name }
    });
  } catch (err) {
    return res.status(500).json({ error: `Login error: ${err.message}` });
  }
});

/**
 * GET /api/admin/documents
 * List documents with filter by status, doc_type, department
 */
router.get('/documents', requireAdminAuth, async (req, res) => {
  const { status, doc_type, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doc_type) filter.doc_type = doc_type;
  if (search) filter.title = new RegExp(search, 'i');

  try {
    if (Document.db && Document.db.readyState === 1) {
      const docs = await Document.find(filter).sort({ upload_date: -1 }).populate('supersedes', 'title version upload_date');
      return res.json({ count: docs.length, documents: docs });
    }

    // In-memory fallback if Mongo disconnected
    return res.json({
      count: 0,
      documents: [],
      storage: 'transient'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/index/status
 * Index status placeholder while RAG/NLP pipeline is disconnected
 */
router.get('/index/status', requireAdminAuth, async (req, res) => {
  return res.json({
    status: 'disconnected',
    message: 'NLP/RAG indexing service is disconnected.',
    chunks_count: 0
  });
});

/**
 * POST /api/admin/debug/retrieve
 * Debug retrieval placeholder while RAG/NLP pipeline is disconnected
 */
router.post('/debug/retrieve', requireAdminAuth, async (req, res) => {
  return res.json({
    status: 'disconnected',
    message: 'NLP/RAG retrieval service is disconnected.',
    results: []
  });
});

/**
 * POST /api/admin/documents/upload
 * Multi-part file upload with checksum duplicate check & automatic versioning
 */
router.post('/documents/upload', requireAdminAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const {
    title,
    topic_key,
    doc_type = 'notice',
    department = 'Examination Cell',
    effective_date = new Date().toISOString()
  } = req.body;

  if (!title || !topic_key) {
    return res.status(400).json({ error: 'Title and topic_key are mandatory fields.' });
  }

  try {
    const checksum = calculateChecksum(req.file.path);

    // Duplicate Check
    if (Document.db && Document.db.readyState === 1) {
      const existingDuplicate = await Document.findOne({ checksum });
      if (existingDuplicate) {
        return res.status(409).json({
          error: 'Duplicate document detected: Identical file has already been uploaded.',
          existing_document: existingDuplicate
        });
      }
    }

    // Determine Version Number for the given topic_key
    let nextVersion = 1;
    let priorDoc = null;

    if (Document.db && Document.db.readyState === 1) {
      priorDoc = await Document.findOne({ topic_key, status: 'active' }).sort({ version: -1 });
      if (priorDoc) {
        nextVersion = priorDoc.version + 1;
      }
    }

    // Persist Document metadata in MongoDB
    let newDoc = null;
    const docStatus = 'active';
    const processingStatus = 'uploaded';

    if (Document.db && Document.db.readyState === 1) {
      if (priorDoc) {
        await Document.findByIdAndUpdate(priorDoc._id, { status: 'superseded' });
      }

      newDoc = await Document.create({
        title,
        topic_key,
        doc_type,
        department,
        version: nextVersion,
        status: docStatus,
        checksum,
        file_path: req.file.path,
        effective_date: new Date(effective_date),
        supersedes: priorDoc ? priorDoc._id : null,
        chunk_count: 0,
        processing_status: processingStatus,
        error_message: null
      });
    } else {
      newDoc = {
        title,
        topic_key,
        version: nextVersion,
        status: docStatus,
        processing_status: processingStatus,
        chunk_count: 0
      };
    }

    await recordAuditLog({
      actorId: req.admin?.id,
      action: 'document_upload',
      targetType: 'document',
      targetId: newDoc._id ? String(newDoc._id) : null,
      meta: { title, topic_key, version: nextVersion, department },
      req
    });

    return res.status(201).json({
      message: 'Document uploaded and versioned successfully.',
      document: newDoc,
      superseded_prior_version: Boolean(priorDoc),
      new_index_version: nextVersion,
      calendar_candidates_count: 0
    });
  } catch (err) {
    return res.status(500).json({ error: `Upload processing failed: ${err.message}` });
  }
});

/**
 * POST /api/admin/documents/reindex
 * Rebuilds all search indexes (placeholder while disconnected)
 */
router.post('/documents/reindex', requireAdminAuth, async (req, res) => {
  await serverCacheManager.invalidateAll();
  return res.json({
    message: 'Cache invalidated. Document re-indexing will resume when the new RAG service is connected.'
  });
});

/**
 * PATCH /api/admin/documents/:id/status
 * Archive or change status of a document
 */
router.patch('/documents/:id/status', requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'superseded', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  try {
    if (Document.db && Document.db.readyState === 1) {
      const doc = await Document.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!doc) return res.status(404).json({ error: 'Document not found.' });

      await serverCacheManager.invalidateAll();

      await recordAuditLog({
        actorId: req.admin?.id,
        action: 'document_status_change',
        targetType: 'document',
        targetId: req.params.id,
        meta: { newStatus: status, title: doc.title },
        req
      });

      return res.json({ message: 'Document status updated', document: doc });
    }
    return res.json({ message: 'Updated status (transient mode)' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/documents/:id
 * Permanently removes a document record and its uploaded file.
 */
router.delete('/documents/:id', requireAdminAuth, async (req, res) => {
  try {
    if (!(Document.db && Document.db.readyState === 1)) {
      return res.status(503).json({ error: 'Document deletion requires MongoDB to be connected.' });
    }

    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Remove the stored file, but never touch anything outside the upload directory.
    try {
      const fs = require('fs');
      const { UPLOAD_DIR } = require('./uploadMiddleware');
      const resolved = require('path').resolve(doc.file_path || '');
      if (doc.file_path && resolved.startsWith(UPLOAD_DIR) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch (fileErr) {
      console.warn(`[Admin] Could not remove file for document ${req.params.id}: ${fileErr.message}`);
    }

    await serverCacheManager.invalidateAll();

    await recordAuditLog({
      actorId: req.admin?.id,
      action: 'document_delete',
      targetType: 'document',
      targetId: req.params.id,
      meta: { title: doc.title, topic_key: doc.topic_key },
      req
    });

    return res.json({ success: true, deletedId: req.params.id });
  } catch (err) {
    return res.status(500).json({ error: `Delete failed: ${err.message}` });
  }
});

module.exports = router;
