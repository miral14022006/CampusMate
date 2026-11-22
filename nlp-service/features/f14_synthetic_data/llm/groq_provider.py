import os
import logging
from typing import Optional
import requests
from features.f14_synthetic_data.llm.base import BaseLLMProvider

logger = logging.getLogger("synthetic_data.groq")

DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
FALLBACK_GROQ_MODELS = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]

class GroqProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        raw_model = model or os.getenv("GROQ_MODEL", "")
        if not raw_model or "gemini" in raw_model.lower():
            self.model = DEFAULT_GROQ_MODEL
        else:
            self.model = raw_model
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.2) -> str:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not configured.")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CampusMate/1.0"
        }

        candidate_models = [self.model] + [m for m in FALLBACK_GROQ_MODELS if m != self.model]
        last_err = None

        for cand_model in candidate_models:
            payload = {
                "model": cand_model,
                "messages": messages,
                "temperature": temperature
            }
            try:
                resp = requests.post(self.endpoint, json=payload, headers=headers, timeout=25)
                if resp.status_code == 429:
                    logger.warning(f"Groq model {cand_model} rate limited (429). Trying fallback model...")
                    continue
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                last_err = e
                logger.warning(f"Groq request with {cand_model} failed: {e}")

        logger.error(f"All Groq models failed. Last error: {last_err}")
        raise last_err
