#!/usr/bin/env node
/**
 * Remove explicitly flagged demo/seeded records from production collections.
 * Only records with isSeeded:true / isDemo:true (or legacy seeded/demo flags)
 * are touched. Real uploaded documents are never deleted.
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';
const FLAGS = ['isSeeded', 'isDemo', 'seeded', 'demo'];

async function main() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray()).map(c => c.name).sort();
  let deleted = 0;

  for (const name of collections) {
    const coll = db.collection(name);
    for (const flag of FLAGS) {
      try {
        const res = await coll.deleteMany({ [flag]: true });
        if (res.deletedCount) {
          console.log(`[purge] ${name}.${flag}: deleted ${res.deletedCount}`);
          deleted += res.deletedCount;
        }
      } catch (err) {
        // Ignore collections that reject the query (e.g. views).
      }
    }
  }

  console.log(`[purge] Total demo/seeded records deleted: ${deleted}`);
  for (const name of collections) {
    const count = await db.collection(name).countDocuments();
    if (count) console.log(`[remaining] ${name}: ${count}`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[purge] Fatal: ' + err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
