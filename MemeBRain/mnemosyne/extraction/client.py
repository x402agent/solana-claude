"""LLM client for fact extraction via OpenRouter.

Reuses the same patterns as tools/evaluate_beam_end_to_end.py LLMClient.
100% open source (MIT).
"""

import json as _json
import os
import time
import urllib.request

# ── Defaults ──────────────────────────────────────────────────────────────
DEFAULT_EXTRACTION_MODEL = os.environ.get(
    "MNEMOSYNE_EXTRACTION_MODEL",
    "google/gemini-2.5-flash",
)
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get(
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1",
).rstrip("/")
FALLBACK_MODELS = [
    "google/gemini-flash-latest",
     # Fallback: older
]


class ExtractionClient:
    """OpenAI-compatible API client for fact extraction via OpenRouter."""

    def __init__(
        self,
        model: str = None,
        api_key: str = None,
        base_url: str = None,
    ):
        self.model = model or DEFAULT_EXTRACTION_MODEL
        self.api_key = api_key or OPENROUTER_API_KEY
        self.base_url = (base_url or OPENROUTER_BASE_URL).rstrip("/")
        self.call_count = 0

    def chat(
        self,
        messages: list,
        temperature: float = 0.0,
        max_tokens: int = 4096,
    ) -> str:
        """Send chat completion with fallback and retry.

        Returns the response text, or empty string on total failure.
        """
        models_to_try = [self.model] + [
            m for m in FALLBACK_MODELS if m != self.model
        ]
        last_error = None

        for model in models_to_try:
            for attempt in range(3):
                try:
                    return self._call_api(
                        model, messages, temperature, max_tokens
                    )
                except Exception as e:
                    last_error = str(e)
                    if "429" in last_error or "rate" in last_error.lower():
                        wait = 2 ** attempt
                        time.sleep(wait)
                        continue
                    else:
                        break  # Non-retryable, try next model
            # Brief pause between models
            time.sleep(1)

        # All models failed
        return ""

    def _call_api(
        self,
        model: str,
        messages: list,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Single API call via urllib."""
        url = f"{self.base_url}/chat/completions"
        payload = _json.dumps(
            {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        ).encode()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        req = urllib.request.Request(url, data=payload, headers=headers)
        resp = urllib.request.urlopen(req, timeout=60)
        data = _json.loads(resp.read())
        self.call_count += 1
        return data["choices"][0]["message"]["content"]

    def extract_facts(self, messages: list) -> list:
        """Extract structured facts from a list of conversation messages.

        Args:
            messages: List of dicts with 'role' and 'content' keys.

        Returns:
            List of fact dicts (subject, predicate, object, etc.), or empty list on failure.
        """
        from .prompts import EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_TEMPLATE

        # Build conversation text from messages
        conversation_text = ""
        for i, msg in enumerate(messages):
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            if content.strip():
                conversation_text += f"[{i}] [{role}]: {content}\n"

        if not conversation_text.strip():
            return []

        user_prompt = EXTRACTION_USER_TEMPLATE.format(
            conversation_text=conversation_text,
        )

        chat_messages = [
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        response = self.chat(chat_messages, temperature=0.0, max_tokens=4096)

        if not response:
            return []

        # Parse JSON from response
        try:
            json_start = response.find("[")
            json_end = response.rfind("]") + 1
            if json_start >= 0 and json_end > json_start:
                facts = _json.loads(response[json_start:json_end])
                if isinstance(facts, list):
                    return facts
        except (_json.JSONDecodeError, ValueError):
            pass

        return []
