import os
import json
import logging
from typing import Optional
import requests
from features.f14_synthetic_data.llm.base import BaseLLMProvider

logger = logging.getLogger("synthetic_data.ollama")

class OllamaProvider(BaseLLMProvider):
    def __init__(self, base_url: Optional[str] = None, model: str = "llama3"):
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", model)
        self.endpoint = f"{self.base_url.rstrip('/')}/api/generate"

    def generate(self, prompt: str, system_prompt: Optional[str] = None, temperature: float = 0.8) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_prompt or "",
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        try:
            resp = requests.post(self.endpoint, json=payload, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            return data["response"]
        except Exception as e:
            logger.error(f"Ollama API request failed at {self.endpoint}: {e}")
            raise

