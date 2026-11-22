const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_API_KEY = process.env.NLP_API_KEY || 'campus_mate_secret_token_123';
const NLP_TIMEOUT_MS = parseInt(process.env.NLP_TIMEOUT_MS, 10) || 60000;

class NlpClient {
  constructor(baseURL = NLP_SERVICE_URL, apiKey = NLP_API_KEY) {
    this.client = axios.create({
      baseURL,
      timeout: NLP_TIMEOUT_MS,
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

  async query(query, sessionId = null, dialogueState = null, conversationHistory = []) {
    const payload = {
      query,
      session_id: sessionId,
      dialogue_state: dialogueState,
      conversation_history: conversationHistory
    };
    try {
      const res = await this.client.post('/v1/chat', payload);
      return res.data;
    } catch (err) {
      // Fallback to /v1/query for backward compatibility with pipeline microservice
      const fallbackRes = await this.client.post('/v1/query', payload);
      return fallbackRes.data;
    }
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
