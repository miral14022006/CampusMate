const axios = require('axios');

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_API_KEY = process.env.NLP_API_KEY || 'campus_mate_secret_token_123';
const TIMEOUT_MS = parseInt(process.env.NLP_TIMEOUT_MS || '25000', 10);
const MAX_RETRIES = parseInt(process.env.NLP_MAX_RETRIES || '2', 10);

/**
 * Production NLP Service Client.
 * Implements authentication headers, configurable timeouts, exponential backoff retries,
 * and robust error mapping with graceful fallback.
 */
class NlpClient {
  constructor(baseURL = NLP_SERVICE_URL, apiKey = NLP_API_KEY) {
    this.client = axios.create({
      baseURL,
      timeout: TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });
  }

  /**
   * Helper executing request with exponential backoff retries.
   * @param {Function} requestFn 
   * @param {number} retriesLeft 
   * @param {number} delay 
   */
  async _executeWithRetry(requestFn, retriesLeft = MAX_RETRIES, delay = 200) {
    try {
      return await requestFn();
    } catch (err) {
      if (retriesLeft > 0 && (!err.response || err.response.status >= 500)) {
        console.warn(`[NLP Client] Request failed: ${err.message}. Retrying in ${delay}ms... (${retriesLeft} left)`);
        await new Promise((res) => setTimeout(res, delay));
        return this._executeWithRetry(requestFn, retriesLeft - 1, delay * 2);
      }
      throw this._mapError(err);
    }
  }

  /**
   * Maps internal network or HTTP errors to structured error objects.
   * @param {Error} err 
   */
  _mapError(err) {
    if (err.response) {
      return {
        status: err.response.status,
        code: 'NLP_SERVICE_HTTP_ERROR',
        message: err.response.data?.detail || err.response.data?.message || err.message,
        data: err.response.data
      };
    } else if (err.code === 'ECONNABORTED') {
      return {
        status: 504,
        code: 'NLP_SERVICE_TIMEOUT',
        message: `NLP service request timed out after ${TIMEOUT_MS}ms`
      };
    } else {
      return {
        status: 503,
        code: 'NLP_SERVICE_UNAVAILABLE',
        message: `Cannot connect to NLP microservice at ${NLP_SERVICE_URL}: ${err.message}`
      };
    }
  }

  /**
   * Queries NLP service /v1/query.
   * @param {string} query 
   * @param {string} [languageOverride] 
   * @param {string} [sessionId] 
   * @param {object} [dialogueState]
   */
  async query(query, languageOverride = null, sessionId = null, dialogueState = null) {
    return this._executeWithRetry(async () => {
      const response = await this.client.post('/v1/query', {
        query,
        language_override: languageOverride,
        session_id: sessionId,
        dialogue_state: dialogueState
      });
      return response.data;
    });
  }

  /**
   * Queries NLP service /v1/analyze for intermediate pipeline results without answer synthesis.
   * @param {string} query 
   * @param {string} [languageOverride]
   * @param {string} [sessionId]
   * @param {object} [dialogueState]
   */
  async analyze(query, languageOverride = null, sessionId = null, dialogueState = null) {
    return this._executeWithRetry(async () => {
      const response = await this.client.post('/v1/analyze', {
        query,
        language_override: languageOverride,
        session_id: sessionId,
        dialogue_state: dialogueState
      });
      return response.data;
    });
  }

  /**
   * Checks health of NLP microservice.
   */
  async health() {
    try {
      const res = await this.client.get('/v1/health');
      return res.data;
    } catch (err) {
      return { status: 'down', error: err.message };
    }
  }

  async getHealth() {
    return this.health();
  }

  async getReady() {
    try {
      const res = await this.client.get('/v1/ready');
      return res.data;
    } catch (err) {
      return { status: 'down', error: err.message };
    }
  }
}

const nlpClient = new NlpClient();
module.exports = { NlpClient, nlpClient };
