const TelegramBot = require('node-telegram-bot-api');
const { processChannelQuery } = require('./channels/channelDispatcher');
const { recordFeedback } = require('../f10_feedback');
const { sessionManager } = require('../f06_sessions');

// In-memory per-user sliding window rate limiter (max 20 requests per minute)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function checkTelegramRateLimit(userId) {
  const now = Date.now();
  const userData = rateLimitMap.get(userId) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > userData.resetAt) {
    userData.count = 1;
    userData.resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(userId, userData);
    return true;
  }

  if (userData.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userData.count += 1;
  rateLimitMap.set(userId, userData);
  return true;
}

/**
 * Formats bot message text with verified citations (Feature 04)
 */
function formatTelegramResponse(result) {
  let text = result.answer || '';

  // Append citations if available
  if (result.citations && result.citations.length > 0) {
    text += '\n\n📚 *Verified Sources:*\n';
    result.citations.forEach((c, idx) => {
      text += `[${idx + 1}] _${c.doc_name || 'Official Notice'}_ (Page ${c.page || 1})\n`;
    });
  }

  // Metadata badge line
  const lang = result.language || 'en';
  const conf = Math.round((result.confidence || 0) * 100);
  text += `\n🌐 \`[${lang.toUpperCase()}]\` • Intent: \`${result.intent || 'general'}\` (${conf}%)`;

  return text;
}

/**
 * Creates inline keyboard buttons for clarification questions (Feature 05)
 * and feedback thumbs up/down (Feature 10).
 */
function buildInlineKeyboard(result) {
  const inlineKeyboard = [];

  // 1. Clarification Quick Reply Buttons
  if (result.quick_replies && result.quick_replies.length > 0) {
    const quickReplyRow = result.quick_replies.map((qr) => ({
      text: qr.label || qr.payload,
      callback_data: `qr:${qr.payload || qr.label}`
    }));
    inlineKeyboard.push(quickReplyRow);
  }

  // 2. Feedback Thumbs Up / Down row
  const msgId = result.messageId || `msg_${Date.now()}`;
  inlineKeyboard.push([
    { text: '👍 Helpful', callback_data: `fb:up:${msgId}` },
    { text: '👎 Not Helpful', callback_data: `fb:down:${msgId}` }
  ]);

  return { inline_keyboard: inlineKeyboard };
}

class TelegramBotManager {
  constructor(options = {}) {
    this.token = options.token || process.env.TELEGRAM_BOT_TOKEN;
    this.webhookUrl = options.webhookUrl || process.env.TELEGRAM_WEBHOOK_URL;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.bot = null;
    this.initialized = false;
  }

  initialize() {
    if (!this.token) {
      console.warn('[TelegramBot] TELEGRAM_BOT_TOKEN not configured. Bot will run in stub mode.');
      return null;
    }

    if (this.initialized) return this.bot;

    try {
      if (this.isProduction && this.webhookUrl) {
        // Production: Webhook mode
        this.bot = new TelegramBot(this.token, { webHook: true });
        this.bot.setWebHook(`${this.webhookUrl}/api/telegram/webhook`);
        console.log(`[TelegramBot] Initialized in WEBHOOK mode -> ${this.webhookUrl}`);
      } else {
        // Development / Testing: Long Polling
        this.bot = new TelegramBot(this.token, { polling: true });
        console.log('[TelegramBot] Initialized in LONG POLLING mode.');
      }

      this.registerHandlers();
      this.initialized = true;
      return this.bot;
    } catch (err) {
      console.error(`[TelegramBot] Failed to start bot: ${err.message}`);
      return null;
    }
  }

  registerHandlers() {
    if (!this.bot) return;

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const welcome =
        `🎓 *Welcome to CampusAI Assistant!*\n\n` +
        `Ask me any questions about admissions, fees, exams, hostel, syllabus, or college buses.\n\n` +
        `Supported languages:\n` +
        `• English\n• हिन्दी (Hindi)\n• ગુજરાતી (Gujarati)\n• Hinglish / Gujlish\n\n` +
        `Commands:\n` +
        `• /help - Usage instructions\n` +
        `• /language - Language tips\n` +
        `• /reset - Clear session history`;

      this.bot.sendMessage(chatId, welcome, { parse_mode: 'Markdown' });
    });

    // /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const help =
        `💡 *Campus Assistant Help:*\n\n` +
        `Just type your question naturally, like:\n` +
        `• _"When is the last date to submit the exam form?"_\n` +
        `• _"हॉस्टल में मेस का खाना और नियम क्या हैं?"_\n` +
        `• _"College ma admission mate ketli fees chhe?"_\n` +
        `• _"Exam timetable for 5th semester IT"_\n\n` +
        `Type /reset whenever you want to start a new inquiry topic!`;

      this.bot.sendMessage(chatId, help, { parse_mode: 'Markdown' });
    });

    // /language command
    this.bot.onText(/\/language/, (msg) => {
      const chatId = msg.chat.id;
      const langInfo =
        `🌐 *Multilingual Instructions:*\n\n` +
        `You can type directly in native Devanagari (हिंदी), Gujarati script (ગુજરાતી), or Romanized phonetic Hinglish/Gujlish.\n` +
        `Our Indic transliteration and language identification engine automatically routes and normalizes your query!`;

      this.bot.sendMessage(chatId, langInfo, { parse_mode: 'Markdown' });
    });

    // /reset command (Feature 06)
    this.bot.onText(/\/reset/, async (msg) => {
      const chatId = msg.chat.id;
      const sessionId = `telegram_${chatId}`;
      await sessionManager.resetState(sessionId);
      this.bot.sendMessage(chatId, `🔄 *Session conversation context has been reset.* What would you like to inquire about?`, {
        parse_mode: 'Markdown'
      });
    });

    // Callback queries (Clarification buttons & Feedback clicks)
    this.bot.on('callback_query', async (callbackQuery) => {
      const { id, data, message } = callbackQuery;
      const chatId = message.chat.id;
      const sessionId = `telegram_${chatId}`;

      try {
        if (data.startsWith('fb:')) {
          // Feedback handler (Feature 10)
          const [, rating, msgId] = data.split(':');
          await recordFeedback({
            messageId: msgId || `tg_${Date.now()}`,
            sessionId,
            query: message.text?.slice(0, 100) || 'Telegram Query',
            rating: rating === 'up' ? 'up' : 'down',
            reason: rating === 'down' ? 'not helpful' : null,
            pipelineSnapshot: { channel: 'telegram', answer: message.text }
          });

          await this.bot.answerCallbackQuery(id, {
            text: rating === 'up' ? '👍 Thank you for your feedback!' : '👎 Thank you. Logged for admin review.'
          });
        } else if (data.startsWith('qr:')) {
          // Quick reply clarification payload (Feature 05)
          const payload = data.replace('qr:', '');
          await this.bot.answerCallbackQuery(id);
          // Process query automatically as user's next turn
          await this.handleUserQuery(chatId, payload);
        }
      } catch (err) {
        console.error('[TelegramBot Callback Error]:', err.message);
      }
    });

    // Free-text messages
    this.bot.on('message', async (msg) => {
      const text = msg.text;
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      // Skip slash commands
      if (!text || text.startsWith('/')) return;

      // Rate limiting
      if (!checkTelegramRateLimit(userId)) {
        return this.bot.sendMessage(
          chatId,
          '⚠️ *Rate limit exceeded:* Please wait a moment before sending more messages.',
          { parse_mode: 'Markdown' }
        );
      }

      await this.handleUserQuery(chatId, text);
    });
  }

  async handleUserQuery(chatId, text) {
    const sessionId = `telegram_${chatId}`;
    try {
      this.bot.sendChatAction(chatId, 'typing');

      const result = await processChannelQuery({
        channel: 'telegram',
        sessionId,
        query: text,
        clientMeta: { chatId }
      });

      const responseText = formatTelegramResponse(result);
      const keyboard = buildInlineKeyboard(result);

      await this.bot.sendMessage(chatId, responseText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (err) {
      console.error(`[Telegram Query Error]: ${err.message}`);
      await this.bot.sendMessage(
        chatId,
        'Sorry, I encountered an error retrieving that information. Please try again shortly.'
      );
    }
  }

  // Webhook handler for Express endpoint
  handleWebhookUpdate(update) {
    if (this.bot) {
      this.bot.processUpdate(update);
    }
  }
}

const telegramBotManager = new TelegramBotManager();

module.exports = {
  telegramBotManager,
  TelegramBotManager,
  checkTelegramRateLimit,
  formatTelegramResponse,
  buildInlineKeyboard
};

