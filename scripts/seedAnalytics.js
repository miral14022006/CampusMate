#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../server/.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../server/features/f16_auth/models/User');
const ActivityEvent = require('../server/features/f17_activity/models/ActivityEvent');
const QueryAnalyticsLog = require('../server/models/QueryAnalyticsLog');
const PersistentConversation = require('../server/features/f00_history/conversationModel');
const Message = require('../server/models/Message');
const Document = require('../server/models/Document');
const fs = require('fs');
const path = require('path');
const UPLOAD_DIR = path.resolve(__dirname, '../data/uploads');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const match = arg.match(/^--([^=]+)=?(.*)$/);
  if (match) acc[match[1]] = match[2] === '' ? true : match[2];
  return acc;
}, {});

const STUDENT_COUNT = Number(args.students || 150);
const EVENT_COUNT = Number(args.events || 20000);
const DAYS = Number(args.days || 90);
const CLEAN = args.clean !== 'false';
const INCLUDE_DEMO = args.includeDemo !== 'false';

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Pari', 'Anika', 'Navya', 'Mira', 'Riya', 'Kavya'];
const LAST_NAMES = ['Patel', 'Shah', 'Mehta', 'Desai', 'Joshi', 'Trivedi', 'Bhatt', 'Chauhan', 'Rathod', 'Solanki', 'Nair', 'Iyer', 'Menon', 'Reddy', 'Rao'];
const BRANCHES = ['Computer Engineering', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering'];
const LANGUAGES = ['en', 'hi', 'gu', 'hi-Latn', 'gu-Latn'];
const LANG_WEIGHTS = [0.36, 0.19, 0.14, 0.19, 0.12];
const INTENTS = ['exam_form_deadline', 'fee_payment', 'fee_structure', 'attendance_rules', 'scholarship', 'holidays', 'hostel', 'admission', 're_evaluation', 'placement', 'bonafide_certificate', 'library_timings', 'bus_transport', 'syllabus', 'backlog_rules', 'contact_office', 'out_of_scope'];
const ACTIVITY_TYPES = ['page_view', 'chat_query', 'chat_query', 'chat_query', 'document_view', 'document_view', 'document_download', 'calendar_add', 'login', 'logout', 'feedback', 'signup'];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[rand(0, list.length - 1)];
}

function weighted(list, weights) {
  const r = Math.random();
  let total = 0;
  for (let i = 0; i < list.length; i += 1) {
    total += weights[i];
    if (r <= total) return list[i];
  }
  return list[list.length - 1];
}

function realisticDate(days) {
  const now = Date.now();
  const dayOffset = rand(0, days - 1);
  const day = new Date(now - dayOffset * 86400000);
  const weekday = day.getDay();
  // Weekends are quieter; Tuesday-Thursday are busiest.
  if (weekday === 0 && Math.random() < 0.55) return realisticDate(days);
  if (weekday === 6 && Math.random() < 0.35) return realisticDate(days);
  const hourWeights = [0.2, 0.1, 0.1, 0.2, 0.4, 0.8, 1.6, 3, 6, 9, 10, 9, 7, 8, 9, 8, 6, 4, 2.5, 1.6, 1, 0.6, 0.4, 0.3];
  let hour = 0;
  let total = 0;
  const target = Math.random() * hourWeights.reduce((a, b) => a + b, 0);
  for (let h = 0; h < hourWeights.length; h += 1) {
    total += hourWeights[h];
    if (target <= total) {
      hour = h;
      break;
    }
  }
  day.setHours(hour, rand(0, 59), rand(0, 59), 0);
  if (day.getTime() > now) day.setTime(now - rand(60000, 3600000));
  return day;
}


function makeDemoPdf(title, pages = 3) {
  const escape = (value) => String(value).replace(/[()\\]/g, '\\$&');
  const pageIds = [];
  const contentIds = [];
  let nextId = 3;
  for (let i = 0; i < pages; i += 1) {
    pageIds.push(nextId++);
    contentIds.push(nextId++);
  }
  const fontId = nextId++;
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages} >>`;
  for (let i = 0; i < pages; i += 1) {
    objects[pageIds[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    const stream = `BT /F1 18 Tf 72 720 Td (${escape(title)}) Tj ET\nBT /F1 11 Tf 72 690 Td (Page ${i + 1} of ${pages}) Tj ET`;
    objects[contentIds[i]] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  }
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(output);
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(output);
}

async function seedDemoDocuments(count = 12) {
  if (!count) return [];
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await Document.deleteMany({ topic_key: /^demo_/ });
  const now = new Date();
  const demoDocs = [];
  const departments = ['Examination Cell', 'Accounts Office', 'Hostel Office', 'Academic Section', 'Student Welfare'];
  const types = ['circular', 'notice', 'handbook', 'calendar'];
  for (let i = 0; i < count; i += 1) {
    const version = i === 2 ? 2 : 1;
    const fileName = `demo_campus_notice_${i + 1}_v${version}.pdf`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const title = `Demo Campus Notice ${i + 1} - ${['Exam form schedule', 'Fee payment window', 'Hostel allotment', 'Scholarship application', 'Semester calendar'][i % 5]}`;
    fs.writeFileSync(filePath, makeDemoPdf(title, 3));
    demoDocs.push({
      title,
      topic_key: `demo_notice_${i + 1}`,
      doc_type: types[i % types.length],
      department: departments[i % departments.length],
      effective_date: new Date(now.getTime() - (i + 3) * 86400000),
      upload_date: new Date(now.getTime() - (i + 1) * 86400000),
      version,
      status: i === 2 ? 'superseded' : 'active',
      file_path: filePath,
      file_name: fileName,
      checksum: crypto.createHash('sha256').update(`${fileName}:${i}`).digest('hex'),
      original_name: fileName,
      language: 'en',
      processing_status: 'completed',
      chunk_count: 3,
      metadata: { page_count: 3, isDemo: true }
    });
  }
  const inserted = await Document.insertMany(demoDocs, { ordered: false });
  console.log(`[seedAnalytics] created ${inserted.length} demo documents`);
  return inserted;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[seedAnalytics] connected to ${uri}`);

  if (CLEAN) {
    await Promise.all([
      User.deleteMany({ isDemo: true }),
      ActivityEvent.deleteMany({ isDemo: true }),
      QueryAnalyticsLog.deleteMany({ isSeeded: true }),
      PersistentConversation.deleteMany({ isDemo: true }),
      Message.deleteMany({ sessionId: /^demo_/ }),
      Document.deleteMany({ topic_key: /^demo_/ })
    ]);
    console.log('[seedAnalytics] removed previous demo data');
  }

  const passwordHash = await bcrypt.hash('Demo@12345', 10);
  const students = [];
  for (let i = 0; i < STUDENT_COUNT; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const created = new Date(Date.now() - rand(1, DAYS) * 86400000);
    students.push({
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@pdeu.ac.in`,
      passwordHash,
      role: 'student',
      status: Math.random() < 0.05 ? 'disabled' : 'active',
      semester: rand(1, 8),
      branch: pick(BRANCHES),
      emailVerified: true,
      lastLoginAt: new Date(Date.now() - rand(0, 7) * 86400000),
      isDemo: true,
      createdAt: created,
      updatedAt: created
    });
  }
  const insertedStudents = await User.insertMany(students, { ordered: false });
  console.log(`[seedAnalytics] created ${insertedStudents.length} demo students`);

  await seedDemoDocuments(Number(args.documents || 12));
  const documents = await Document.find({ status: 'active' }).select('_id title file_name original_name').lean();
  const docPool = documents.length
    ? documents
    : Array.from({ length: 8 }, (_, i) => ({
        _id: new mongoose.Types.ObjectId(),
        title: `Demo notice ${i + 1}`,
        file_name: `demo_notice_${i + 1}.pdf`,
        original_name: `demo_notice_${i + 1}.pdf`
      }));

  const guestClients = Array.from({ length: Math.max(40, Math.round(STUDENT_COUNT * 0.8)) }, (_, i) => `demo_guest_${i}`);

  const events = [];
  const queryLogs = [];
  for (const student of insertedStudents) {
    events.push({
      userId: student._id,
      clientId: null,
      actorType: 'student',
      type: 'signup',
      meta: {},
      ipHash: crypto.createHash('sha256').update(`demo-signup:${student._id}`).digest('hex'),
      userAgentFamily: 'Chrome / Android',
      isDemo: true,
      createdAt: student.createdAt
    });
  }
  for (let i = 0; i < EVENT_COUNT; i += 1) {
    const student = Math.random() < 0.82 ? pick(insertedStudents) : null;
    const type = pick(ACTIVITY_TYPES);
    const at = realisticDate(DAYS);
    const doc = pick(docPool);
    const language = weighted(LANGUAGES, LANG_WEIGHTS);
    const intent = pick(INTENTS);

    const meta = {};
    if (type === 'document_view' || type === 'document_download') {
      meta.docId = String(doc._id);
      meta.page = rand(1, 24);
    }
    if (type === 'chat_query') {
      meta.conversationId = `demo_conv_${rand(1, 320)}`;
      meta.intent = intent;
      meta.language = language;
    }
    if (type === 'calendar_add') {
      meta.category = pick(['exam', 'holiday', 'fee', 'event']);
      meta.docId = String(doc._id);
      meta.page = rand(1, 10);
    }
    if (type === 'feedback') meta.rating = Math.random() < 0.86 ? 'up' : 'down';

    events.push({
      userId: student ? student._id : null,
      clientId: student ? null : pick(guestClients),
      actorType: student ? 'student' : 'guest',
      type,
      meta,
      ipHash: crypto.createHash('sha256').update(`demo:${crypto.randomUUID()}`).digest('hex'),
      userAgentFamily: pick(['Chrome / Android', 'Safari / iOS', 'Chrome / macOS', 'Edge / Windows', 'Firefox / Linux']),
      isDemo: true,
      createdAt: at
    });

    if (type === 'chat_query' && Math.random() < 0.45) {
      queryLogs.push({
        requestId: `demo_req_${i}`,
        sessionId: meta.conversationId,
        query: 'Demo query',
        normalizedQuery: 'demo query',
        language,
        intent,
        confidence: Math.round((0.55 + Math.random() * 0.44) * 100) / 100,
        sourceDoc: intent === 'out_of_scope' ? null : doc.original_name,
        decision: intent === 'out_of_scope' ? 'FALLBACK' : 'ANSWER',
        isUnanswered: intent === 'out_of_scope',
        isClarification: false,
        cached: Math.random() < 0.4,
        rating: Math.random() < 0.2 ? (Math.random() < 0.9 ? 'up' : 'down') : null,
        totalLatencyMs: rand(90, 420),
        nlpExecutionTimeMs: rand(60, 360),
        isSeeded: true,
        createdAt: at
      });
    }
  }

  await ActivityEvent.insertMany(events, { ordered: false });
  console.log(`[seedAnalytics] created ${events.length} activity events`);

  const conversations = [];
  const messages = [];
  for (let i = 0; i < 320; i += 1) {
    const student = Math.random() < 0.75 ? pick(insertedStudents) : null;
    const sessionId = `demo_conv_${i + 1}`;
    const at = realisticDate(DAYS);
    conversations.push({
      sessionId,
      clientId: student ? `demo_owner_${student._id}` : pick(guestClients),
      userId: student ? String(student._id) : null,
      title: pick(['Exam form deadline', 'Fee payment help', 'Hostel rules', 'Library timings', 'Scholarship details', 'Bus routes', 'Attendance policy']),
      lastMessagePreview: 'Demo conversation generated for dashboard evaluation.',
      messageCount: 4,
      isDemo: true,
      createdAt: at,
      updatedAt: at
    });
    messages.push(
      { sessionId, sender: 'user', text: 'What is the exam form deadline?', language: 'en', createdAt: at },
      { sessionId, sender: 'assistant', text: 'The last date to submit the exam form is the 15th.', language: 'en', intent: 'exam_form_deadline', confidence: 0.91, sourceDoc: docPool[0]?.original_name || null, createdAt: new Date(at.getTime() + 1000) },
      { sessionId, sender: 'user', text: 'Where can I download the notice?', language: 'en', createdAt: new Date(at.getTime() + 2000) },
      { sessionId, sender: 'assistant', text: 'The notice is available in the document library.', language: 'en', intent: 'contact_office', confidence: 0.84, sourceDoc: docPool[0]?.original_name || null, createdAt: new Date(at.getTime() + 3000) }
    );
  }
  conversations.forEach((conversation, index) => {
    queryLogs.push({
      requestId: `demo_conv_req_${index + 1}`,
      sessionId: conversation.sessionId,
      query: 'Demo conversation query',
      normalizedQuery: 'demo conversation query',
      language: weighted(LANGUAGES, LANG_WEIGHTS),
      intent: pick(INTENTS),
      confidence: Math.round((0.55 + Math.random() * 0.44) * 100) / 100,
      sourceDoc: docPool[index % docPool.length]?.original_name || null,
      decision: 'ANSWER',
      isUnanswered: Math.random() < 0.06,
      isClarification: false,
      cached: Math.random() < 0.4,
      rating: Math.random() < 0.2 ? (Math.random() < 0.9 ? 'up' : 'down') : null,
      totalLatencyMs: rand(90, 420),
      nlpExecutionTimeMs: rand(60, 360),
      isSeeded: true,
      createdAt: conversation.updatedAt
    });
  });
  if (queryLogs.length) {
    await QueryAnalyticsLog.insertMany(queryLogs, { ordered: false });
    console.log(`[seedAnalytics] created ${queryLogs.length} query analytics rows`);
  }

  await PersistentConversation.insertMany(conversations, { ordered: false });
  await Message.insertMany(messages, { ordered: false });
  console.log('[seedAnalytics] created demo conversations and transcripts');

  console.log(`[seedAnalytics] done. Demo data included: ${INCLUDE_DEMO}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seedAnalytics] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
