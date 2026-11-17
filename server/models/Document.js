const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  topic_key: { type: String, required: true, index: true }, // e.g. "exam_form_schedule"
  doc_type: {
    type: String,
    enum: ['circular', 'notice', 'calendar', 'handbook', 'general'],
    default: 'notice',
    index: true
  },
  department: { type: String, default: 'Examination Cell' },
  effective_date: { type: Date, default: Date.now },
  upload_date: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
  supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  status: {
    type: String,
    enum: ['active', 'superseded', 'archived'],
    default: 'active',
    index: true
  },
  file_path: { type: String, required: true },
  file_name: { type: String, required: true },
  checksum: { type: String, required: true, index: true },
  language: { type: String, default: 'en' },
  processing_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  chunk_count: { type: Number, default: 0 },
  index_version: { type: String, default: 'v1' },
  metadata: { type: Map, of: String, default: {} }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', DocumentSchema);

