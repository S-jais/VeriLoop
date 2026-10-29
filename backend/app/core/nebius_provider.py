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

NEBIUS_MODEL_CANONICAL_MAP = {
    "nvidia/nemotron-3-nano-30b-a3b": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    "nvidia/nemotron-3-ultra-550b-a55b": "nvidia/Nemotron-3-Ultra-550b-a55b",
    "nvidia/nemotron-3-super-120b-a12b": "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3.5-ultra": "nvidia/Nemotron-3-Ultra-550b-a55b",
    "nvidia/nemotron-3_5-ultra": "nvidia/Nemotron-3-Ultra-550b-a55b",
}


def resolve_nebius_model_id(model_id: Optional[str]) -> str:
    """Normalize model identifiers to canonical Nebius Token Factory model IDs."""
    if not model_id:
        return settings.nebius_primary_model
    normalized = model_id.lower().strip()
    return NEBIUS_MODEL_CANONICAL_MAP.get(normalized, model_id)


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
        Generate text from the NVIDIA model via Nebius Token Factory.
        Includes token caps, exponential backoff on 429/5xx, and fallback to fast model.
        """
        if not settings.nebius_api_key:
            raise RuntimeError(
                "NEBIUS_API_KEY is not configured. Cannot call Nebius Token Factory."
            )

        # Cap tokens per call
        effective_max_tokens = min(max_tokens, settings.max_tokens_per_call)
        target_model = resolve_nebius_model_id(model or settings.nebius_primary_model)
        fallback_model = resolve_nebius_model_id(settings.nebius_fast_model)
        models_to_try = [target_model]
        if fallback_model != target_model:
            models_to_try.append(fallback_model)

        last_exception = None

        for current_model in models_to_try:
            start = time.time()
            max_attempts = 3

            for attempt in range(max_attempts):
                try:
                    logger.info(
                        "nebius_call_start task=%s model=%s attempt=%d/%d messages=%d",
                        task_label, current_model, attempt + 1, max_attempts, len(messages)
                    )

                    response = await self._client.chat.completions.create(
                        model=current_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=effective_max_tokens,
                    )

                    latency_ms = int((time.time() - start) * 1000)
                    content = response.choices[0].message.content or ""
                    usage = response.usage
                    p_toks = usage.prompt_tokens if usage else 0
                    c_toks = usage.completion_tokens if usage else 0
                    cost_usd = (p_toks * 0.20 + c_toks * 0.60) / 1_000_000

                    logger.info(
                        "nebius_call_success task=%s model=%s latency_ms=%d prompt_tokens=%d completion_tokens=%d cost_usd=%.6f",
                        task_label, current_model, latency_ms, p_toks, c_toks, cost_usd
                    )

                    return ModelCallResult(
                        content=content,
                        model=current_model,
                        usage_prompt_tokens=p_toks,
                        usage_completion_tokens=c_toks,
                        latency_ms=latency_ms,
                    )

                except Exception as e:
                    last_exception = e
                    status_code = getattr(e, "status_code", None)
                    err_str = str(e).lower()
                    is_retryable = (
                        status_code in (429, 500, 502, 503, 504)
                        or "rate limit" in err_str
                        or "timeout" in err_str
                        or "connection error" in err_str
                    )

                    if is_retryable and attempt < max_attempts - 1:
                        backoff_seconds = (2 ** attempt) * 0.5 + (0.1 * attempt)
                        logger.warning(
                            "nebius_call_retryable_error task=%s model=%s status=%s error=%s backing off %.1fs",
                            task_label, current_model, status_code, str(e), backoff_seconds
                        )
                        import asyncio
                        await asyncio.sleep(backoff_seconds)
                    else:
                        logger.error(
                            "nebius_call_attempt_failed task=%s model=%s error=%s",
                            task_label, current_model, str(e)
                        )
                        break

            # If primary model exhausted attempts, log fallback
            if current_model != models_to_try[-1]:
                logger.warning(
                    "Primary model %s failed. Falling back to %s for task=%s",
                    current_model, models_to_try[-1], task_label
                )

        raise RuntimeError(f"All model attempts failed for {task_label}: {last_exception}")

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
            f"Do not include any markdown fences, conversational text, or explanation before or after the JSON object."
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

                # Extract JSON from response (handle markdown code fences or embedded JSON)
                raw = result.content.strip()
                if "```json" in raw:
                    raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
                elif "```" in raw:
                    raw = raw.split("```", 1)[1].split("```", 1)[0].strip()

                # If wrapped in non-JSON text, extract substring between first '{' and last '}'
                first_brace = raw.find("{")
                last_brace = raw.rfind("}")
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    raw = raw[first_brace : last_brace + 1]

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
