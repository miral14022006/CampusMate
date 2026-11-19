const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Document = require('../../models/Document');
const { optionalAuth } = require('../f16_auth');
const { recordInBackground } = require('../f17_activity/activityService');
const { UPLOAD_DIR } = require('../f08_admin/uploadMiddleware');

const router = express.Router();

const IMAGE_TYPES = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function publicDocument(doc) {
  const metadata = doc.metadata instanceof Map ? Object.fromEntries(doc.metadata) : doc.metadata || {};
  return {
    id: String(doc._id),
    title: doc.title,
    type: doc.doc_type,
    doc_type: doc.doc_type,
    department: doc.department,
    effective_date: doc.effective_date,
    upload_date: doc.upload_date,
    version: doc.version,
    status: doc.status,
    language: doc.language,
    page_count: Number(metadata.page_count || metadata.pages || 1),
    file_name: doc.file_name,
    original_name: doc.original_name,
    supersedes: doc.supersedes || null,
    updated: Boolean(doc.updatedAt && doc.upload_date && doc.updatedAt > doc.upload_date)
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/documents
 * Public library. Only ACTIVE documents appear here; superseded versions stay
 * reachable by id so old citations can still open them.
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, search, type, doc_type, department, page = 1, limit = 60 } = req.query;
    const filter = { status: 'active' };
    const requestedType = type || doc_type;
    if (requestedType && requestedType !== 'all') filter.doc_type = requestedType;
    if (department && department !== 'all') filter.department = department;

    const term = String(q || search || '').trim();
    if (term) {
      const rx = new RegExp(escapeRegex(term), 'i');
      filter.$or = [{ title: rx }, { department: rx }, { original_name: rx }, { topic_key: rx }];
    }

    if (!Document.db || Document.db.readyState !== 1) {
      return res.json({ documents: [], total: 0, page: 1, pages: 0, storage: 'transient' });
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 60, 1), 100);
    const parsedPage = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
      Document.find(filter)
        .sort({ effective_date: -1, upload_date: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      Document.countDocuments(filter)
    ]);

    const departments = await Document.distinct('department', { status: 'active' });
    const types = await Document.distinct('doc_type', { status: 'active' });

    return res.json({
      documents: items.map(publicDocument),
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit) || 0,
      filters: { departments: departments.filter(Boolean).sort(), types: types.filter(Boolean).sort() }
    });
  } catch {
    return res.status(500).json({ error: 'Could not load the document library.' });
  }
});

async function findDocument(idOrName) {
  if (!idOrName) return null;
  if (mongoose.isValidObjectId(idOrName)) {
    const byId = await Document.findById(idOrName);
    if (byId) return byId;
  }
  const safe = escapeRegex(idOrName);
  return Document.findOne({
    $or: [
      { file_name: idOrName },
      { original_name: idOrName },
      { title: new RegExp(`^${safe}$`, 'i') }
    ]
  }).sort({ version: -1 });
}

/**
 * GET /api/documents/:id
 * Viewer metadata, including superseded documents referenced by old citations.
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!Document.db || Document.db.readyState !== 1) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const doc = await findDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    let replacement = null;
    if (doc.status === 'superseded') {
      replacement = await Document.findOne({
        supersedes: doc._id,
        status: 'active'
      })
        .select('_id title version')
        .lean();
    }

    return res.json({
      document: {
        ...publicDocument(doc),
        is_image: IMAGE_TYPES.has(path.extname(doc.file_name || '').toLowerCase()),
        superseded_by: replacement
      }
    });
  } catch {
    return res.status(500).json({ error: 'Could not load this document.' });
  }
});

/**
 * GET /api/documents/:id/file
 * Streams the original notice (PDF or scanned image). `?page=` is accepted for
 * viewer deep-links and recorded with the view. `download=1` records a download.
 */
router.get('/:id/file', optionalAuth, async (req, res) => {
  try {
    if (!Document.db || Document.db.readyState !== 1) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    const doc = await findDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const resolved = path.resolve(doc.file_path || path.join(UPLOAD_DIR, doc.file_name || ''));
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).json({ error: 'The document file is missing from storage.' });
    }

    const ext = path.extname(resolved).toLowerCase();
    const isDownload = String(req.query.download || '') === '1';
    recordInBackground({
      req,
      type: isDownload ? 'document_download' : 'document_view',
      meta: {
        docId: String(doc._id),
        page: req.query.page ? Number(req.query.page) : null,
        source: req.query.source || 'document_library'
      }
    });

    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(doc.original_name || doc.file_name || 'document')}"`
    );
    return fs.createReadStream(resolved).pipe(res);
  } catch {
    return res.status(500).json({ error: 'Could not stream this document.' });
  }
});

module.exports = router;
module.exports.publicDocument = publicDocument;
