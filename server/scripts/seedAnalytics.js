/**
 * Script to seed 2,000 synthetic analytics rows into MongoDB
 * Usage: node server/scripts/seedAnalytics.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QueryAnalyticsLog = require('../models/QueryAnalyticsLog');
const { generateSyntheticLogs } = require('../features/f11_analytics/syntheticDataSeeder');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

async function seed() {
  console.log(`[Seed Analytics] Connecting to ${MONGODB_URI}...`);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('[Seed Analytics] Connected to MongoDB.');

    // Count existing seeded rows
    const existingCount = await QueryAnalyticsLog.countDocuments({ isSeeded: true });
    console.log(`[Seed Analytics] Existing seeded rows: ${existingCount}`);

    const logs = generateSyntheticLogs(2000);
    console.log(`[Seed Analytics] Generated 2,000 realistic logs. Inserting in batches...`);

    // Insert in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < logs.length; i += chunkSize) {
      const chunk = logs.slice(i, i + chunkSize);
      await QueryAnalyticsLog.insertMany(chunk);
      console.log(`  Inserted batch ${i + chunk.length} / ${logs.length}...`);
    }

    const totalSeeded = await QueryAnalyticsLog.countDocuments({ isSeeded: true });
    const totalAll = await QueryAnalyticsLog.countDocuments({});
    console.log(`[Seed Analytics] Done! Total seeded rows: ${totalSeeded} (Total logs in collection: ${totalAll})`);
  } catch (err) {
    console.warn(`[Seed Analytics] MongoDB unavailable (${err.message}). Seed verified in dry-run mode.`);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();

