const express = require('express');
const axios = require('axios');
const featureFlags = require('../../config/features');

const router = express.Router();
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/chat/message
 * Handles student queries, calls multilingual NLP service, and formats response.
 */
router.post('/message', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query text is required.' });
  }

  try {
    let languageMeta = { language: 'en', confidence: 1.0, is_transliterated: false };

    // Check if feature flag is active
    if (featureFlags.multilingual_detection) {
      try {
        const nlpRes = await axios.post(`${NLP_SERVICE_URL}/language/detect`, {
          text: query
        }, { timeout: 3000 });
        languageMeta = nlpRes.data;
      } catch (err) {
        console.warn(`[Chat] NLP service language detection failed or timed out: ${err.message}. Falling back to baseline.`);
      }
    }

    // Baseline response template
    const responsePayload = {
      reply: `Response received for: "${query}"`,
      detected_language: languageMeta.language,
      confidence: languageMeta.confidence,
      is_transliterated: languageMeta.is_transliterated,
      feature_active: featureFlags.multilingual_detection
    };

    return res.json(responsePayload);
  } catch (error) {
    console.error(`[Chat Error] ${error.message}`);
    return res.status(500).json({ error: 'Internal server error processing message.' });
  }
});

module.exports = router;

