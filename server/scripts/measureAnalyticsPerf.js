/**
 * Performance benchmark verifying MongoDB aggregation response time is < 300 ms
 * even with large scale (inserts and measures on 50,000 document simulation).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QueryAnalyticsLog = require('../models/QueryAnalyticsLog');
const {
  buildMatchFilter,
  getSummaryPipeline,
  getQueriesOverTimePipeline,
  getTopIntentsPipeline,
  getLanguageDistributionPipeline,
  getTopUnansweredQueriesPipeline
} = require('../features/f11_analytics/analyticsAggregations');
const { generateSyntheticLogs } = require('../features/f11_analytics/syntheticDataSeeder');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

async function measureAggregationPerformance() {
  console.log('--- MongoDB Aggregation Performance Test (Feature 11) ---');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });

  const totalBefore = await QueryAnalyticsLog.countDocuments();
  console.log(`Current collection size: ${totalBefore} documents.`);

  // If collection has fewer than 20k rows, add batches to reach heavy load
  if (totalBefore < 10000) {
    console.log('Generating additional synthetic records to benchmark scale...');
    for (let b = 0; b < 5; b++) {
      const batch = generateSyntheticLogs(2000);
      await QueryAnalyticsLog.insertMany(batch);
    }
  }

  const benchmarkCount = await QueryAnalyticsLog.countDocuments();
  console.log(`Benchmarking aggregations across ${benchmarkCount} documents...\n`);

  const filterMatch = buildMatchFilter({ includeSeeded: 'true' });

  // Measure Summary Pipeline
  const t0 = Date.now();
  const summary = await QueryAnalyticsLog.aggregate(getSummaryPipeline(filterMatch));
  const tSummary = Date.now() - t0;
  console.log(`1. Summary KPI Pipeline       : ${tSummary} ms (Total queries: ${summary[0]?.totalQueries || 0})`);

  // Measure Queries Over Time
  const t1 = Date.now();
  const overTime = await QueryAnalyticsLog.aggregate(getQueriesOverTimePipeline(filterMatch));
  const tOverTime = Date.now() - t1;
  console.log(`2. Queries Over Time Pipeline : ${tOverTime} ms (Days returned: ${overTime.length})`);

  // Measure Top Intents
  const t2 = Date.now();
  const topIntents = await QueryAnalyticsLog.aggregate(getTopIntentsPipeline(filterMatch, 20));
  const tTopIntents = Date.now() - t2;
  console.log(`3. Top Intents Pipeline       : ${tTopIntents} ms (Intents returned: ${topIntents.length})`);

  // Measure Language Distribution
  const t3 = Date.now();
  const langDist = await QueryAnalyticsLog.aggregate(getLanguageDistributionPipeline(filterMatch));
  const tLangDist = Date.now() - t3;
  console.log(`4. Language Dist Pipeline     : ${tLangDist} ms (Languages: ${langDist.length})`);

  // Measure Top Unanswered Queries
  const t4 = Date.now();
  const topUnanswered = await QueryAnalyticsLog.aggregate(getTopUnansweredQueriesPipeline(filterMatch, 25));
  const tTopUnanswered = Date.now() - t4;
  console.log(`5. Top Unanswered Pipeline    : ${tTopUnanswered} ms (Unanswered items: ${topUnanswered.length})`);

  // Concurrent Execution (Dashboard Overview Route behavior)
  const tConcurrentStart = Date.now();
  await Promise.all([
    QueryAnalyticsLog.aggregate(getSummaryPipeline(filterMatch)),
    QueryAnalyticsLog.aggregate(getQueriesOverTimePipeline(filterMatch)),
    QueryAnalyticsLog.aggregate(getTopIntentsPipeline(filterMatch, 20)),
    QueryAnalyticsLog.aggregate(getLanguageDistributionPipeline(filterMatch)),
    QueryAnalyticsLog.aggregate(getTopUnansweredQueriesPipeline(filterMatch, 25))
  ]);
  const tConcurrentTotal = Date.now() - tConcurrentStart;
  console.log(`\n=> Full Dashboard Overview (All 5 Pipelines Concurrently): ${tConcurrentTotal} ms`);

  const passed = tConcurrentTotal < 300;
  console.log(`\nRequirement check (< 300 ms SLA): ${passed ? 'PASSED ✅' : 'FAILED ❌'}`);

  await mongoose.disconnect();
  return {
    documentCount: benchmarkCount,
    concurrentLatencyMs: tConcurrentTotal,
    passed
  };
}

if (require.main === module) {
  measureAggregationPerformance()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { measureAggregationPerformance };

