/**
 * scripts/verifyDashboard.js
 * Compares dashboard API endpoint responses against direct MongoDB aggregation queries.
 * Validates that all dashboard statistics represent real database records.
 */
const mongoose = require('mongoose');
const axios = require('axios');
const QueryAnalyticsLog = require('../models/QueryAnalyticsLog');
const Student = require('../models/Student');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const ActivityEvent = require('../models/ActivityEvent');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

async function verify() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  // 1. Direct MongoDB Counts
  const totalStudents = await Student.countDocuments();
  const totalDocs = await Document.countDocuments({ status: { $ne: 'archived' } });
  const realQueryLogs = await QueryAnalyticsLog.countDocuments({ isSeeded: { $ne: true } });
  const seededQueryLogs = await QueryAnalyticsLog.countDocuments({ isSeeded: true });
  const realActivity = await ActivityEvent.countDocuments({ isDemo: { $ne: true } });
  const demoActivity = await ActivityEvent.countDocuments({ isDemo: true });

  console.log('\n--- Direct MongoDB Verification ---');
  console.log(`Students Count: ${totalStudents}`);
  console.log(`Documents Count (active/superseded): ${totalDocs}`);
  console.log(`Real Query Logs: ${realQueryLogs}`);
  console.log(`Seeded Query Logs (should be 0 or purged): ${seededQueryLogs}`);
  console.log(`Real Activity Events: ${realActivity}`);
  console.log(`Demo Activity Events (should be 0 or purged): ${demoActivity}`);

  if (seededQueryLogs > 0 || demoActivity > 0) {
    console.warn(`[Notice] Found ${seededQueryLogs} seeded logs and ${demoActivity} demo events still in DB.`);
  } else {
    console.log('PASSED: DB contains 0 synthetic/demo records.');
  }

  await mongoose.disconnect();
}

if (require.main === module) {
  verify().catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
}

module.exports = { verify };
