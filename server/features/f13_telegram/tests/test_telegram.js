const assert = require('assert');
const {
  checkTelegramRateLimit,
  formatTelegramResponse,
  buildInlineKeyboard
} = require('../telegramBot');
const { WhatsAppAdapter } = require('../channels/WhatsAppAdapter');

function runTests() {
  console.log('Running Telegram & Channel Adapter Unit Tests...');

  // Test 1: Telegram Rate Limiter
  const userId = 'user_test_123';
  for (let i = 0; i < 20; i++) {
    assert.strictEqual(checkTelegramRateLimit(userId), true, `Request ${i} should be allowed`);
  }
  // 21st request should be rejected by rate limiter
  assert.strictEqual(checkTelegramRateLimit(userId), false, '21st request must be rate limited');
  console.log('✓ Test 1: Telegram sliding window rate limiting verified');

  // Test 2: Telegram Markdown Formatting with Citations
  const sampleResult = {
    answer: 'The last date to submit the exam form is 25th November 2024.',
    language: 'en',
    intent: 'exam_form_deadline',
    confidence: 0.94,
    citations: [
      { doc_name: 'exam_schedule.pdf', page: 2 }
    ]
  };
  const formattedText = formatTelegramResponse(sampleResult);
  assert.ok(formattedText.includes('The last date to submit'));
  assert.ok(formattedText.includes('Verified Sources:'));
  assert.ok(formattedText.includes('exam_schedule.pdf'));
  assert.ok(formattedText.includes('`[EN]`'));
  console.log('✓ Test 2: Markdown citation and badge formatter verified');

  // Test 3: Inline Keyboard Builder (Clarification quick replies + Thumbs Feedback)
  const resultWithQR = {
    messageId: 'msg_tg_001',
    quick_replies: [
      { label: 'Hostel Fees', payload: 'hostel fees' },
      { label: 'Room Booking', payload: 'room booking' }
    ]
  };
  const keyboard = buildInlineKeyboard(resultWithQR);
  assert.strictEqual(keyboard.inline_keyboard.length, 2);
  assert.strictEqual(keyboard.inline_keyboard[0][0].text, 'Hostel Fees');
  assert.strictEqual(keyboard.inline_keyboard[0][0].callback_data, 'qr:hostel fees');
  assert.strictEqual(keyboard.inline_keyboard[1][0].text, '👍 Helpful');
  assert.strictEqual(keyboard.inline_keyboard[1][1].text, '👎 Not Helpful');
  console.log('✓ Test 3: Clarification and feedback inline keyboard structure validated');

  // Test 4: WhatsApp Adapter Stub Behavior
  const waDisabled = new WhatsAppAdapter({ enabled: false });
  assert.strictEqual(waDisabled.isEnabled(), false);
  const waEnabled = new WhatsAppAdapter({ enabled: true });
  assert.strictEqual(waEnabled.isEnabled(), true);
  console.log('✓ Test 4: WhatsApp adapter interface and toggle behavior validated');

  console.log('\nAll 4 Feature 13 unit tests passed successfully!\n');
}

runTests();

