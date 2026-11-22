import os
import logging
from typing import Optional
import requests
from features.f14_synthetic_data.llm.base import BaseLLMProvider

logger = logging.getLogger("synthetic_data.groq")

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"

class GroqProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY", "")
        raw_model = model or os.getenv("GROQ_MODEL", "")
        # Safeguard: if environment variable still points to gemini model, use Groq model
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

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "CampusMate/1.0"
        }

        try:
            resp = requests.post(self.endpoint, json=payload, headers=headers, timeout=25)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"Groq API request failed: {e}")
            raise
