"""
Nebius Token Factory provider — the central inference layer.
Uses OpenAI-compatible API to route all NVIDIA model calls.
"""

import logging
import time
from typing import Any, Optional, Type, TypeVar
from openai import AsyncOpenAI
from pydantic import BaseModel
import json

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

T = TypeVar("T", bound=BaseModel)


class ModelCallResult:
    """Structured result from a model call."""
    def __init__(
        self,
        content: str,
        model: str,
        usage_prompt_tokens: int = 0,
        usage_completion_tokens: int = 0,
        latency_ms: int = 0,
    ):
        self.content = content
        self.model = model
        self.usage_prompt_tokens = usage_prompt_tokens
        self.usage_completion_tokens = usage_completion_tokens
        self.latency_ms = latency_ms


class NebiusTokenFactoryProvider:
    """
    Centralized provider for all AI inference via Nebius Token Factory.
    All NVIDIA model calls go through this class.
    """

    def __init__(self):
        if not settings.nebius_api_key:
            logger.warning(
                "NEBIUS_API_KEY not configured. AI inference will not work. "
                "Please set NEBIUS_API_KEY in your .env file."
            )
        self._client = AsyncOpenAI(
            api_key=settings.nebius_api_key or "not-configured",
            base_url=settings.nebius_base_url,
        )

    async def generate_text(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        task_label: str = "generate_text",
    ) -> ModelCallResult:
        """
        Generate free-form text from the NVIDIA model via Nebius Token Factory.
        """
        if not settings.nebius_api_key:
            raise RuntimeError(
                "NEBIUS_API_KEY is not configured. Cannot call Nebius Token Factory."
            )

        model = model or settings.nebius_primary_model
        start = time.time()

        logger.info(
            "nebius_call_start task=%s model=%s messages=%d",
            task_label, model, len(messages)
        )

        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            latency_ms = int((time.time() - start) * 1000)
            content = response.choices[0].message.content or ""
            usage = response.usage

            logger.info(
                "nebius_call_success task=%s model=%s latency_ms=%d "
                "prompt_tokens=%d completion_tokens=%d",
                task_label, model, latency_ms,
                usage.prompt_tokens if usage else 0,
                usage.completion_tokens if usage else 0,
            )

            return ModelCallResult(
                content=content,
                model=model,
                usage_prompt_tokens=usage.prompt_tokens if usage else 0,
                usage_completion_tokens=usage.completion_tokens if usage else 0,
                latency_ms=latency_ms,
            )

        except Exception as e:
            latency_ms = int((time.time() - start) * 1000)
            logger.error(
                "nebius_call_failure task=%s model=%s latency_ms=%d error=%s",
                task_label, model, latency_ms, str(e)
            )
            raise

    async def generate_structured(
        self,
        messages: list[dict],
        schema_class: Type[T],
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        task_label: str = "generate_structured",
        max_retries: int = 2,
    ) -> tuple[T, ModelCallResult]:
        """
        Generate structured output conforming to a Pydantic schema.
        Uses JSON mode and validates against the schema.
        Retries on parse failure up to max_retries times.
        """
        if not settings.nebius_api_key:
            raise RuntimeError(
                "NEBIUS_API_KEY is not configured. Cannot call Nebius Token Factory."
            )

        model = model or settings.nebius_primary_model

        # Append JSON instruction to last user message
        schema_instruction = (
            f"\n\nYou MUST respond with ONLY valid JSON that conforms to this schema:\n"
            f"{json.dumps(schema_class.model_json_schema(), indent=2)}\n"
            f"Do not include any text before or after the JSON object."
        )

        enhanced_messages = list(messages)
        if enhanced_messages and enhanced_messages[-1]["role"] == "user":
            enhanced_messages[-1] = {
                **enhanced_messages[-1],
                "content": enhanced_messages[-1]["content"] + schema_instruction,
            }

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                result = await self.generate_text(
                    messages=enhanced_messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    task_label=f"{task_label}_attempt_{attempt}",
                )

                # Extract JSON from response (handle markdown code fences)
                raw = result.content.strip()
                if raw.startswith("```"):
                    lines = raw.split("\n")
                    raw = "\n".join(lines[1:-1]).strip()

                parsed = json.loads(raw)
                validated = schema_class.model_validate(parsed)
                return validated, result

            except (json.JSONDecodeError, Exception) as e:
                last_error = e
                logger.warning(
                    "generate_structured parse failure attempt=%d task=%s error=%s",
                    attempt, task_label, str(e)
                )

        raise ValueError(
            f"Failed to generate valid structured output after {max_retries + 1} attempts. "
            f"Last error: {last_error}"
        )

    async def list_models(self) -> list[dict]:
        """Query Nebius Token Factory for currently available models."""
        try:
            models = await self._client.models.list()
            return [{"id": m.id} for m in models.data]
        except Exception as e:
            logger.error("Failed to list Nebius models: %s", str(e))
            return []


# Singleton instance
_provider: Optional[NebiusTokenFactoryProvider] = None


def get_nebius_provider() -> NebiusTokenFactoryProvider:
    global _provider
    if _provider is None:
        _provider = NebiusTokenFactoryProvider()
    return _provider
