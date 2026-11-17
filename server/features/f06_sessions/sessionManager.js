/**
 * Feature 06: Session Manager.
 * Manages hot dialogue state with Redis (configured TTL) and Mongo persistence.
 * If Redis is unavailable or offline, seamlessly falls back to an in-memory TTL cache
 * so development and tests execute without external dependencies.
 */
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '1800', 10); // 30 minutes

class SessionManager {
  constructor(redisClient = null) {
    this.redisClient = redisClient;
    this.memStore = new Map(); // session_id -> { state, expiresAt }
  }

  setRedisClient(client) {
    this.redisClient = client;
  }

  _getMemory(sessionId) {
    const entry = this.memStore.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memStore.delete(sessionId);
      return null;
    }
    return entry.state;
  }

  _setMemory(sessionId, state, ttlSeconds = SESSION_TTL_SECONDS) {
    this.memStore.set(sessionId, {
      state,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  /**
   * Retrieves active dialogue state for a session.
   */
  async getState(sessionId) {
    if (!sessionId) return null;

    if (this.redisClient && this.redisClient.isOpen) {
      try {
        const val = await this.redisClient.get(`dialogue_state:${sessionId}`);
        if (val) return JSON.parse(val);
      } catch (err) {
        console.warn(`[SessionManager] Redis get failed for ${sessionId}: ${err.message}`);
      }
    }

    return this._getMemory(sessionId);
  }

  /**
   * Saves updated dialogue state with TTL to Redis and memory store.
   */
  async saveState(sessionId, state, ttlSeconds = SESSION_TTL_SECONDS) {
    if (!sessionId || !state) return;

    this._setMemory(sessionId, state, ttlSeconds);

    if (this.redisClient && this.redisClient.isOpen) {
      try {
        await this.redisClient.setEx(
          `dialogue_state:${sessionId}`,
          ttlSeconds,
          JSON.stringify(state)
        );
      } catch (err) {
        console.warn(`[SessionManager] Redis setEx failed for ${sessionId}: ${err.message}`);
      }
    }
  }

  /**
   * Resets active session state in Redis and memory.
   */
  async resetState(sessionId) {
    if (!sessionId) return;
    this.memStore.delete(sessionId);

    if (this.redisClient && this.redisClient.isOpen) {
      try {
        await this.redisClient.del(`dialogue_state:${sessionId}`);
      } catch (err) {
        console.warn(`[SessionManager] Redis del failed for ${sessionId}: ${err.message}`);
      }
    }
  }
}

const sessionManager = new SessionManager();

module.exports = {
  SessionManager,
  sessionManager,
  SESSION_TTL_SECONDS
};
