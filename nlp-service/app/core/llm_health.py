"""Startup LLM self-test used by /v1/ready.

The model name is read exclusively from GEMINI_MODEL. There is deliberately no
hard-coded fallback model: a missing/retired model must be visible to operators.
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

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "").strip()

    _status["llm_model"] = model or None
    _status["llm_checked_at"] = datetime.now(timezone.utc).isoformat()

    if not api_key:
        _status.update(llm="unconfigured", llm_error="GEMINI_API_KEY is not set")
        return dict(_status)
    if not model:
        _status.update(llm="error", llm_error="GEMINI_MODEL is not set")
        return dict(_status)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": "Reply with exactly: OK"}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 32},
    }
    try:
        resp = requests.post(
            url,
            params={"key": api_key},
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout,
        )
        if resp.status_code == 200:
            body = resp.json()
            candidates = body.get("candidates") or []
            text = ""
            if candidates:
                text = "".join(p.get("text", "") for p in candidates[0].get("content", {}).get("parts", []))
            if candidates:
                _status.update(llm="ok", llm_error=None)
            else:
                _status.update(
                    llm="error",
                    llm_error=f"HTTP 200 but no candidates (promptFeedback={body.get('promptFeedback')})",
                )
        else:
            detail = resp.text[:300]
            try:
                detail = resp.json().get("error", {}).get("message", detail)
            except Exception:
                pass
            _status.update(llm="error", llm_error=f"HTTP {resp.status_code}: {_redact(str(detail), api_key)}")
    except Exception as exc:
        message = _redact(f"{type(exc).__name__}: {exc}", api_key)
        _status.update(llm="error", llm_error=message[:500])

    logger.info("LLM self-test: model=%s status=%s error=%s", model, _status["llm"], _status["llm_error"])
    return dict(_status)


def get_llm_status() -> Dict[str, Any]:
    return dict(_status)
