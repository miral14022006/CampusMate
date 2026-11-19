const assert = require('assert');
const mongoose = require('mongoose');
const PersistentConversation = require('../conversationModel');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

async function runTests() {
  console.log('Running Persistent History Isolation & Ownership Tests...');

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });

  const clientA = `client_A_${Date.now()}`;
  const clientB = `client_B_${Date.now()}`;

  // 1. Client A creates conversation
  const sessionA1 = `sess_a1_${Date.now()}`;
  await PersistentConversation.create({
    sessionId: sessionA1,
    clientId: clientA,
    title: 'Client A Private Exam Question',
    updatedAt: new Date()
  });

  // 2. Client B creates conversation
  const sessionB1 = `sess_b1_${Date.now()}`;
  await PersistentConversation.create({
    sessionId: sessionB1,
    clientId: clientB,
    title: 'Client B Private Fee Question',
    updatedAt: new Date()
  });

  // 3. Verify Client A only sees their own conversations
  const listA = await PersistentConversation.find({ clientId: clientA });
  assert.strictEqual(listA.length, 1);
  assert.strictEqual(listA[0].sessionId, sessionA1);
  assert.strictEqual(listA[0].title, 'Client A Private Exam Question');
  console.log('✓ Test 1: Client A receives exclusively Client A conversations');

  // 4. Verify Client B cannot view or find Client A conversation
  const breachAttempt = await PersistentConversation.findOne({ sessionId: sessionA1, clientId: clientB });
  assert.strictEqual(breachAttempt, null, 'Client B must NOT access Client A conversation');
  console.log('✓ Test 2: Client B isolation verified (cannot access sessionA1)');

  // 5. Test Pin & Rename
  await PersistentConversation.findOneAndUpdate(
    { sessionId: sessionA1, clientId: clientA },
    { $set: { pinned: true, title: 'Renamed Pin Exam Question' } }
  );
  const updatedA = await PersistentConversation.findOne({ sessionId: sessionA1, clientId: clientA });
  assert.strictEqual(updatedA.pinned, true);
  assert.strictEqual(updatedA.title, 'Renamed Pin Exam Question');
  console.log('✓ Test 3: Pinning & Renaming verified');

  // Cleanup test documents
  await PersistentConversation.deleteMany({ clientId: { $in: [clientA, clientB] } });
  await mongoose.disconnect();

  console.log('\nAll Persistent History Tests Passed Successfully! ✅\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
