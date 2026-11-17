import os
import json
import logging
from typing import Optional
import requests
from features.f14_synthetic_data.llm.base import BaseLLMProvider

logger = logging.getLogger("synthetic_data.openai")

class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("OPENAI_MODEL", model)
        self.endpoint = "https://api.openai.com/v1/chat/completions"

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.8) -> str:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not configured.")

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
            "Content-Type": "application/json"
        }

        try:
            resp = requests.post(self.endpoint, json=payload, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"OpenAI API request failed: {e}")
            raise

