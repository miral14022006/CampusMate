/**
 * Feature flags configuration for Node.js API Gateway / Server.
 * All features can be toggled on/off independently.
 */
module.exports = {
  multilingual_detection: true,
  rag_retrieval: true,
  cache_enabled: true,
  analytics: true,
  synthetic_data_generation: true,
  production_rest_api: true,
  transliteration: true,
  hybrid_retrieval: true,
  transformer_intent: true,
  clarification_fallback: true,
  dialogue_state: true,
  rag_generation: true,
  document_versioning: true,
  calendar: true,
  calendar_google_oauth: process.env.FEATURE_CALENDAR_GOOGLE_OAUTH === 'true', // off by default
  auth: true
};
