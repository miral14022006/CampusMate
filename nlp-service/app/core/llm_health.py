"""Startup LLM self-test used by /v1/ready.
Supports Groq as primary LLM and Gemini as fallback.
"""
import logging
import os
from typing import Any, Dict, Optional
import requests

logger = logging.getLogger("nlp_service.llm_health")

_status: Dict[str, Any] = {
    "llm": "unconfigured",
    "llm_error": None,
    "llm_model": None,
    "llm_checked_at": None,
}


def _redact(text: str, secret: str) -> str:
    if secret:
        text = text.replace(secret, "<redacted>")
    return text


def run_llm_selftest(timeout: int = 15) -> Dict[str, Any]:
    from datetime import datetime, timezone

    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    _status["llm_checked_at"] = datetime.now(timezone.utc).isoformat()

    # 1. Test Groq if provider is groq or groq_key is present
    if (provider == "groq" and groq_key) or (groq_key and not gemini_key):
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
        _status["llm_model"] = f"groq/{model}"
        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Reply with exactly: OK"}],
            "max_tokens": 16,
            "temperature": 0
        }
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        }
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                _status.update(llm="ok", llm_error=None)
                return dict(_status)
            else:
                _status.update(llm="error", llm_error=f"Groq HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as exc:
            _status.update(llm="error", llm_error=f"Groq {type(exc).__name__}: {exc}")

    # 2. Test Gemini (either primary or fallback)
    if gemini_key:
        model = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest").strip()
        _status["llm_model"] = f"gemini/{model}"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": "Reply with exactly: OK"}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 16},
        }
        try:
            resp = requests.post(
                url,
                params={"key": gemini_key},
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=timeout,
            )
            if resp.status_code == 200:
                _status.update(llm="ok", llm_error=None)
                return dict(_status)
            else:
                detail = resp.text[:200]
                _status.update(llm="error", llm_error=f"Gemini HTTP {resp.status_code}: {_redact(detail, gemini_key)}")
                return dict(_status)
        except Exception as exc:
            _status.update(llm="error", llm_error=_redact(f"Gemini {type(exc).__name__}: {exc}", gemini_key))
            return dict(_status)

    _status.update(llm="unconfigured", llm_error="No LLM API keys configured (GROQ_API_KEY or GEMINI_API_KEY)")
    return dict(_status)


def get_llm_status() -> Dict[str, Any]:
    return dict(_status)
