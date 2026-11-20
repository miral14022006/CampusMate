#!/usr/bin/env node
/**
 * Re-ingest every MongoDB Document from its uploaded file, rebuilding the
 * production index from admin-uploaded documents only.
 *
 * Run inside the server container:
 *   docker compose -f docker-compose.prod.yml exec server node scripts/reindexAllDocuments.js
 */
const mongoose = require('mongoose');
const Document = require('../models/Document');

const NLP_URL = process.env.NLP_SERVICE_URL || 'http://nlp-service:8000';
const NLP_KEY = process.env.NLP_API_KEY || '';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

async function nlpJson(path, options = {}) {
  const res = await fetch(`${NLP_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': NLP_KEY,
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(300000)
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${path} HTTP ${res.status}: ${body.detail || body.error || text.slice(0, 300)}`);
  }
  return body;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`[reindex] Connected to MongoDB; NLP=${NLP_URL}`);

  const docs = await Document.find({}).sort({ upload_date: 1 }).lean();
  console.log(`[reindex] Documents found: ${docs.length}`);

  const rows = [];
  let failures = 0;

  for (const doc of docs) {
    const record = {
      id: String(doc._id),
      filename: doc.original_name || doc.file_name,
      stored_file: doc.file_name,
      type: doc.doc_type,
      title: doc.title,
      status: 'unknown',
      pages: null,
      chunks: 0,
      index_version: null,
      text_length: null,
      preview: '',
      warning: null,
      error: null
    };

    try {
      const result = await nlpJson('/v1/documents/ingest', {
        method: 'POST',
        body: JSON.stringify({
          file_path: doc.file_path,
          title: doc.title,
          topic_key: doc.topic_key,
          doc_type: doc.doc_type,
          version: doc.version || 1,
          effective_date: doc.effective_date ? new Date(doc.effective_date).toISOString() : undefined,
          department: doc.department,
          language: doc.language || 'en',
          replace_topic: true
        })
      });

      const ok = result.chunks_created > 0;
      record.pages = result.pages;
      record.chunks = result.chunks_created;
      record.index_version = result.new_index_version;
      record.text_length = result.text_length;
      record.preview = result.text_preview || '';
      record.warning = result.extraction_warning;
      record.status = ok ? 'completed' : 'failed';

      await Document.updateOne({ _id: doc._id }, {
        $set: {
          status: ok ? 'active' : 'failed',
          processing_status: ok ? 'completed' : 'failed',
          error_message: ok ? null : (result.extraction_warning || 'No text extracted'),
          chunk_count: result.chunks_created,
          index_version: result.new_index_version
        }
      });
      if (!ok) failures += 1;
    } catch (err) {
      failures += 1;
      record.status = 'failed';
      record.error = err.message;
      await Document.updateOne({ _id: doc._id }, {
        $set: {
          status: 'failed',
          processing_status: 'failed',
          error_message: err.message.slice(0, 500),
          chunk_count: 0
        }
      }).catch(() => {});
    }

    rows.push(record);
    console.log('[document] ' + JSON.stringify(record));
  }

  try {
    const reindex = await nlpJson('/v1/documents/reindex', { method: 'POST', body: '{}' });
    console.log('[reindex] ' + JSON.stringify(reindex));
  } catch (err) {
    console.error('[reindex] rebuild failed: ' + err.message);
    failures += 1;
  }

  try {
    const status = await nlpJson('/v1/index/status');
    console.log('[index-status] ' + JSON.stringify(status));
  } catch (err) {
    console.error('[index-status] failed: ' + err.message);
    failures += 1;
  }

  console.log(`[reindex] Done. documents=${rows.length} failures=${failures}`);
  await mongoose.disconnect();
  process.exit(failures ? 2 : 0);
}

main().catch(async (err) => {
  console.error('[reindex] Fatal: ' + err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
