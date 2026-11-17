/**
 * Channel Adapter Interface:
 * Abstract base representation for inbound/outbound communication channels (web, telegram, whatsapp).
 */

class ChannelAdapter {
  constructor(channelName) {
    this.channelName = channelName;
  }

  getChannel() {
    return this.channelName;
  }

  async handleInbound(messagePayload) {
    throw new Error('handleInbound must be implemented by subclass');
  }

  async sendOutbound(recipientId, responsePayload) {
    throw new Error('sendOutbound must be implemented by subclass');
  }
}

module.exports = { ChannelAdapter };

