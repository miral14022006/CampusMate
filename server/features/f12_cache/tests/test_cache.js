const assert = require('assert');
const { generateCacheKey, normalizeQuery, normalizeSlots } = require('../cacheKey');
const { ServerCacheManager } = require('../cacheManager');

function testNormalization() {
  const q1 = "  What are the fees for 5th sem?!! ";
  const q2 = "what are the fees for 5th sem";
  assert.strictEqual(normalizeQuery(q1), normalizeQuery(q2), "Normalized queries must match");

  const s1 = { course: "b.tech", semester: "5th sem" };
  const s2 = { semester: "5th sem ", course: "B.Tech" };
  assert.strictEqual(normalizeSlots(s1), normalizeSlots(s2), "Normalized slots must be sorted and case-insensitive");
  console.log("✓ Normalization tests passed.");
}

function testCacheKeyGeneration() {
  const k1 = generateCacheKey("Exam date?", "en", { semester: "3rd" }, "v1");
  const k2 = generateCacheKey("exam date", "en", { semester: "3rd" }, "v1");
  const k3 = generateCacheKey("exam date", "en", { semester: "3rd" }, "v2"); // new index version

  assert.strictEqual(k1, k2, "Keys for equivalent normalized queries must match");
  assert.notStrictEqual(k1, k3, "Key must change when index_version bumps");
  console.log("✓ Cache key generation and versioning tests passed.");
}

async function testCacheSetGetAndInvalidation() {
  const cm = new ServerCacheManager(null);
  const q = "Hostel admission criteria";

  // Cache miss
  const miss = await cm.get(q, "en");
  assert.strictEqual(miss.cached, false);

  // Cache set
  const payload = {
    answer: "Hostel admission is based on merit.",
    language: "en",
    decision: "ANSWER",
    execution_time_ms: 150
  };
  await cm.set(q, "en", null, payload);

  // Cache hit
  const hit = await cm.get(q, "en");
  assert.strictEqual(hit.cached, true);
  assert.strictEqual(hit.data.answer, payload.answer);

  // Invalidation via index version bump
  await cm.invalidateAll();
  const afterInval = await cm.get(q, "en");
  assert.strictEqual(afterInval.cached, false, "Must miss after index invalidation");

  console.log("✓ Cache set, get, hit tracking and invalidation tests passed.");
}

async function runAll() {
  testNormalization();
  testCacheKeyGeneration();
  await testCacheSetGetAndInvalidation();
  console.log("All Server Cache tests completed successfully!");
}

runAll().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

