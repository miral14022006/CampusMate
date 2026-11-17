const assert = require('assert');
const {
  buildMatchFilter,
  getSummaryPipeline,
  getTopIntentsPipeline,
  calculateP95
} = require('../analyticsAggregations');

function runTests() {
  console.log('Running Analytics Aggregation Pipeline Unit Tests...');

  // Test 1: Date Range Filter Builder
  const filter1 = buildMatchFilter({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    includeSeeded: 'false'
  });
  assert.strictEqual(filter1.isSeeded, false);
  assert.ok(filter1.createdAt.$gte instanceof Date);
  assert.ok(filter1.createdAt.$lte instanceof Date);
  console.log('✓ Test 1: buildMatchFilter handles date ranges and seeded flag');

  // Test 2: P95 Calculation
  const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const p95 = calculateP95(latencies);
  assert.strictEqual(p95, 100);

  const latencies20 = Array.from({ length: 100 }, (_, i) => i + 1); // 1 to 100
  assert.strictEqual(calculateP95(latencies20), 96);
  assert.strictEqual(calculateP95([]), 0);
  console.log('✓ Test 2: calculateP95 mathematical accuracy verified');

  // Test 3: Aggregation Pipeline Structure Verification
  const summaryPipeline = getSummaryPipeline(filter1);
  assert.strictEqual(summaryPipeline[0].$match, filter1);
  assert.ok(summaryPipeline[1].$group.totalQueries);
  assert.ok(summaryPipeline[1].$group.unansweredCount);
  assert.ok(summaryPipeline[1].$group.clarificationCount);
  console.log('✓ Test 3: Summary pipeline schema validated');

  const intentPipeline = getTopIntentsPipeline(filter1, 10);
  assert.strictEqual(intentPipeline[2].$sort.count, -1);
  assert.strictEqual(intentPipeline[3].$limit, 10);
  console.log('✓ Test 4: Top intents pipeline structure validated');

  console.log('\nAll 4 analytics unit tests passed successfully!\n');
}

runTests();

