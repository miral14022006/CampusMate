import os
import time
import logging
from typing import Optional, List
import requests
from features.f14_synthetic_data.llm.base import BaseLLMProvider

logger = logging.getLogger("synthetic_data.groq")

# Available production Groq chat models in order of priority:
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
FALLBACK_GROQ_MODELS = [
    "llama3-70b-8192",
    "llama3-8b-8192",
    "gemma2-9b-it",
    "mixtral-8x7b-32768"
]

class GroqProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        raw_model = model or os.getenv("GROQ_MODEL", "")
        if not raw_model or "gemini" in raw_model.lower():
            self.model = DEFAULT_GROQ_MODEL
        else:
            self.model = raw_model
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"
        self._gemini_fallback = None
        self._session = requests.Session()

    def _get_gemini_fallback(self):
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from features.f14_synthetic_data.llm.gemini_provider import GeminiProvider
                gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
                return GeminiProvider(api_key=gemini_key, model=gemini_model)
            except Exception as e:
                logger.warning(f"Could not initialize Gemini fallback provider: {e}")
        return None

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CampusMate/1.0"
        }

        # Build prioritized list of candidate models
        seen = set()
        candidate_models: List[str] = []
        for m in [self.model] + FALLBACK_GROQ_MODELS:
            if m and m not in seen:
                candidate_models.append(m)
                seen.add(m)

        last_err = None

        if self.api_key:
            # Try at most 2 Groq models (primary + 1 fallback) before switching to Gemini
            for cand_model in candidate_models[:2]:
                payload = {
                    "model": cand_model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 1500
                }

                try:
                    resp = self._session.post(self.endpoint, json=payload, headers=headers, timeout=12)
                    if resp.status_code in [401, 403, 404]:
                        logger.warning(f"Groq authorization/model error ({resp.status_code}) on {cand_model}. Switching to Gemini fallback.")
                        break
                    if resp.status_code == 429:
                        logger.warning(f"Groq model {cand_model} rate limited (429). Trying next fallback...")
                        time.sleep(0.5)
                        continue
                    if resp.status_code >= 500:
                        logger.warning(f"Groq model {cand_model} server error ({resp.status_code}). Trying next fallback...")
                        continue

                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        return content.strip()
                except Exception as e:
                    last_err = e
                    logger.warning(f"Groq attempt with {cand_model} failed: {e}")
                    continue

        # If Groq models are rate limited or fail, seamlessly fallback to Gemini
        gemini_llm = self._get_gemini_fallback()
        if gemini_llm:
            try:
                logger.info("Attempting fallback to Gemini provider...")
                return gemini_llm.generate(prompt=prompt, system_prompt=system_prompt, temperature=temperature)
            except Exception as e:
                logger.error(f"Gemini fallback failed: {e}")
                last_err = e

        logger.error(f"All LLM providers failed. Last error: {last_err}")
        if last_err is not None:
            raise last_err
        raise RuntimeError("No LLM provider could fulfill the request.")
