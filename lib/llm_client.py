"""Groq API client wrapper with JSON mode, retries, and rate limit backoff."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from groq import Groq, GroqError

from lib.config import get_settings

logger = logging.getLogger("secondself.llm")


class LLMClientError(RuntimeError):
    """Raised when LLM call fails after retries."""


class GroqLLMClient:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.groq_api_key
        if not self.api_key:
            raise LLMClientError(
                "GROQ_API_KEY is not configured in environment or .env file."
            )
        self.model = model or settings.groq_model
        self.max_tokens = settings.max_tokens
        self.client = Groq(api_key=self.api_key)

    def complete_json(
        self,
        prompt: str,
        system_prompt: str | None = None,
        max_retries: int = 3,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        """Request JSON structured response from Groq with retry logic."""
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        last_error: Exception | None = None
        for attempt in range(1, max_retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    max_tokens=self.max_tokens,
                    temperature=temperature,
                )
                raw_text = response.choices[0].message.content or "{}"
                data = json.loads(raw_text)
                if isinstance(data, dict):
                    return data
                raise ValueError(f"Expected dict, got {type(data).__name__}")

            except (json.JSONDecodeError, ValueError) as parse_err:
                last_error = parse_err
                logger.warning(
                    "JSON parse error on attempt %d/%d: %s",
                    attempt,
                    max_retries,
                    parse_err,
                )
            except GroqError as api_err:
                last_error = api_err
                logger.warning(
                    "Groq API error on attempt %d/%d: %s",
                    attempt,
                    max_retries,
                    api_err,
                )
                # Exponential backoff for rate limits
                time.sleep(2**attempt)
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Unexpected LLM error on attempt %d/%d: %s",
                    attempt,
                    max_retries,
                    exc,
                )
                time.sleep(1)

        raise LLMClientError(f"LLM json completion failed after {max_retries} attempts: {last_error}")


def get_llm_client() -> GroqLLMClient:
    return GroqLLMClient()
