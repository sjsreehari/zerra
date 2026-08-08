"""Bounded Ollama adapter for offline analysis; never used for live enforcement."""

import json
import os
import re
from urllib.error import URLError
from urllib.request import Request, urlopen


class OllamaUnavailable(RuntimeError):
    pass


def redact(value: object) -> object:
    """Remove secrets and sensitive values before evidence reaches an LLM."""
    sensitive = re.compile(r"token|secret|password|authorization|ssn|salary|api[_-]?key", re.I)
    if isinstance(value, dict):
        return {key: "[REDACTED]" if sensitive.search(key) else redact(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


class OllamaClient:
    def __init__(self, base_url: str | None = None, model: str | None = None, timeout_seconds: int = 20) -> None:
        self.base_url = (base_url or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")).rstrip("/")
        self.model = model or os.getenv("OLLAMA_MODEL", "llama3.2")
        self.timeout_seconds = timeout_seconds

    def health(self) -> dict[str, object]:
        try:
            with urlopen(f"{self.base_url}/api/tags", timeout=3) as response:
                payload = json.loads(response.read())
            models = [item.get("name") for item in payload.get("models", [])]
            return {"available": True, "base_url": self.base_url, "model": self.model, "model_available": self.model in models, "models": models}
        except (URLError, OSError, ValueError):
            return {"available": False, "base_url": self.base_url, "model": self.model, "model_available": False, "models": []}

    def json(self, system: str, evidence: dict[str, object]) -> dict[str, object]:
        body = json.dumps({"model": self.model, "system": system, "prompt": json.dumps(redact(evidence)), "format": "json", "stream": False}).encode()
        request = Request(f"{self.base_url}/api/generate", data=body, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                result = json.loads(response.read())
            return json.loads(result["response"])
        except (URLError, OSError, KeyError, ValueError) as error:
            raise OllamaUnavailable("Ollama analysis is unavailable") from error
