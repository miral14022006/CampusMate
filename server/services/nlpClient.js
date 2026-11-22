const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_API_KEY = process.env.NLP_API_KEY || 'campus_mate_secret_token_123';

class NlpClient {
  constructor(baseURL = NLP_SERVICE_URL, apiKey = NLP_API_KEY) {
    this.client = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });
  }

  async getHealth() {
    try {
      const res = await this.client.get('/health');
      return res.data;
    } catch (err) {
      return { status: 'unavailable', error: err.message };
    }
  }

  async query(query, sessionId = null, dialogueState = null) {
    const payload = {
      query,
      sessionId,
      dialogue_state: dialogueState
    };
    const res = await this.client.post('/v1/chat', payload);
    return res.data;
  }

  async reindex() {
    const res = await this.client.post('/v1/documents/reindex');
    return res.data;
  }

  async getIndexStatus() {
    const res = await this.client.get('/v1/index/status');
    return res.data;
  }
}

const nlpClient = new NlpClient();
module.exports = { NlpClient, nlpClient };
