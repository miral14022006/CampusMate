const { ChannelAdapter } = require('./ChannelAdapter');

/**
 * WhatsApp Adapter Stub (Twilio / Meta Cloud API)
 * Marked as not enabled / future channel plugin.
 */
class WhatsAppAdapter extends ChannelAdapter {
  constructor(options = {}) {
    super('whatsapp');
    this.enabled = Boolean(options.enabled || process.env.WHATSAPP_ENABLED === 'true');
    this.metaPhoneNumberId = options.metaPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || null;
    this.apiToken = options.apiToken || process.env.WHATSAPP_API_TOKEN || null;
  }

  isEnabled() {
    return this.enabled;
  }

  async handleInbound(reqBody) {
    if (!this.enabled) {
      return { status: 'disabled', message: 'WhatsApp channel adapter is currently inactive.' };
    }
    // Stub implementation for Meta WhatsApp Webhook
    const entry = reqBody.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) return null;

    const from = message.from;
    const text = message.text?.body || '';
    return {
      channel: 'whatsapp',
      userId: from,
      text,
      timestamp: message.timestamp
    };
  }

  async sendOutbound(recipientPhone, responsePayload) {
    if (!this.enabled) {
      console.warn(`[WhatsAppAdapter] Outbound message suppressed: adapter not enabled.`);
      return false;
    }
    console.log(`[WhatsAppAdapter Stub] Sending message to ${recipientPhone}: ${responsePayload.text}`);
    return true;
  }
}

module.exports = { WhatsAppAdapter };

