const { telegramBotManager, TelegramBotManager, checkTelegramRateLimit, formatTelegramResponse, buildInlineKeyboard } = require('./telegramBot');
const botRoutes = require('./botRoutes');
const { ChannelAdapter } = require('./channels/ChannelAdapter');
const { WhatsAppAdapter } = require('./channels/WhatsAppAdapter');
const { processChannelQuery } = require('./channels/channelDispatcher');

module.exports = {
  telegramBotManager,
  TelegramBotManager,
  botRoutes,
  ChannelAdapter,
  WhatsAppAdapter,
  processChannelQuery,
  checkTelegramRateLimit,
  formatTelegramResponse,
  buildInlineKeyboard
};

