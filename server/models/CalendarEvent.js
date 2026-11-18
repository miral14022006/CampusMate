const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    titles: {
      en: { type: String, default: '' },
      hi: { type: String, default: '' },
      gu: { type: String, default: '' }
    },
    category: {
      type: String,
      enum: ['exam', 'fee', 'admission', 'holiday', 'result', 'other'],
      default: 'other',
      index: true
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: true },
    description: { type: String, default: '' },
    sourceDocId: { type: String, default: '' },
    sourceDocName: { type: String, default: '' },
    sourcePage: { type: Number, default: 1 },
    sourceChunkId: { type: String, default: '' },
    semester: { type: String, default: null, index: true },
    course: { type: String, default: null },
    branch: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'superseded'],
      default: 'pending',
      index: true
    },
    uid: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, default: 0 },
    needsReview: { type: Boolean, default: false },
    confidence: { type: Number, default: 0.9 }
  },
  {
    timestamps: true
  }
);

CalendarEventSchema.index({ category: 1, semester: 1, status: 1 });

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);
