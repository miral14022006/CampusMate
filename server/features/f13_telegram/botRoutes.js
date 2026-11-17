const express = require('express');
const router = express.Router();
const { telegramBotManager } = require('./telegramBot');
const { WhatsAppAdapter } = require('./channels/WhatsAppAdapter');

const whatsAppAdapter = new WhatsAppAdapter();

/**
 * POST /api/telegram/webhook
 * Receives webhook updates from Telegram Bot API in production mode
 */
router.post('/webhook', (req, res) => {
  try {
    telegramBotManager.handleWebhookUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error(`[Telegram Webhook Error]: ${err.message}`);
    res.sendStatus(500);
  }
});

/**
 * GET /api/telegram/status
 * Health & configuration status of external bot channels
 */
router.get('/status', (req, res) => {
  res.json({
    telegram: {
      enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      mode: process.env.NODE_ENV === 'production' && process.env.TELEGRAM_WEBHOOK_URL ? 'webhook' : 'polling'
    },
    whatsapp: {
      enabled: whatsAppAdapter.isEnabled(),
      status: whatsAppAdapter.isEnabled() ? 'active' : 'disabled_stub'
    }
  });
});

module.exports = router;

