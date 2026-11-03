"""Small Ollama adapter, restricted to the loopback interface (no paid API).

All network calls go to localhost; the user must install and start Ollama.
No user messages are logged or persisted by this application.
"""
from __future__ import annotations

import json
import os
import re
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen

BASE_URL = "http://127.0.0.1:11434"
MODEL = os.getenv("FIRSTHELLO_MODEL", "gemma3:1b")
if not re.fullmatch(r"[A-Za-z0-9_.:/-]{1,100}", MODEL):
    MODEL = "gemma3:1b"


class ModelUnavailable(Exception):
    """Ollama is missing, too slow, or returns invalid model output."""


class Ollama:
    def __init__(self, model: str = MODEL, timeout: float = 30.0):
        self.model = model
        self.timeout = timeout

    def _read(self, path: str, data: dict | None = None, timeout: float | None = None) -> dict:
        raw = None if data is None else json.dumps(data).encode("utf-8")
        req = Request(BASE_URL + path, data=raw,
                      headers={"Content-Type": "application/json"} if raw is not None else {},
                      method="POST" if raw is not None else "GET")
        try:
            with urlopen(req, timeout=timeout or self.timeout) as r:
                value = json.loads(r.read(120_000))
                if not isinstance(value, dict):
                    raise ModelUnavailable("Model service returned an unexpected response.")
                return value
        except (URLError, HTTPError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
            raise ModelUnavailable("Ollama or the selected model is not available.") from exc

    def status(self) -> dict:
        try:
            data = self._read("/api/tags", timeout=1.2)
            models = [m.get("name", "") for m in data.get("models", []) if isinstance(m, dict)]
            available = self.model in models or self.model + ":latest" in models
            return {"ready": available, "model": self.model,
                    "message": "Local AI ready" if available else "Ollama is running, but the selected model has not been downloaded."}
        except ModelUnavailable:
            return {"ready": False, "model": self.model, "message": "Offline suggestions available. Install Ollama to enable local AI."}

      
    
    def chat_json(self, messages: list[dict[str, str]], schema: dict) -> dict:
        is_planner = "tool" in schema.get("properties", {})
        max_output_tokens = 128 if is_planner else 360

        data = self._read("/api/chat", {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": schema,
            "keep_alive": "20m",
            "options": {
                "temperature": 0.25,
                "num_predict": max_output_tokens
            },
        })

        content = data.get("message", {}).get("content", "")

        try:
            result = json.loads(content)
        except (TypeError, ValueError) as exc:
            raise ModelUnavailable("AI did not return valid JSON") from exc

        if not isinstance(result, dict):
            raise ModelUnavailable("AI did not return an object")

        return result
