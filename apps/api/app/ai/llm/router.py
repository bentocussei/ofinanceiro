"""LLM Router: selects provider and model based on task type with automatic fallback.

Multi-layer resilience:
1. Task-based routing with priority chain
2. Retry with exponential backoff per provider
3. Model fallback on consecutive overloads
4. Graceful unavailability message when all fail
"""

import enum
import logging

from app.ai.llm.base import LLMMessage, LLMProvider, LLMResponse, ToolDefinition
from app.ai.llm.retry import ModelFallbackTriggered, RetryExhaustedError, with_retry

logger = logging.getLogger(__name__)


class TaskType(enum.StrEnum):
    ROUTING = "routing"
    CATEGORIZATION = "categorization"
    CONVERSATION = "conversation"
    ANALYSIS = "analysis"
    REPORT_GENERATION = "report_generation"
    OCR_RECEIPT = "ocr_receipt"
    OCR_STATEMENT = "ocr_statement"
    INSIGHT_BATCH = "insight_batch"
    MEMORY_EXTRACTION = "memory_extraction"


# Task → (provider_name, model) with priority order
# Anthropic primary for all language tasks, OpenAI for embeddings/voice
TASK_MODEL_CONFIG: dict[TaskType, list[tuple[str, str]]] = {
    TaskType.ROUTING: [("anthropic", "haiku"), ("openai", "gpt4o-mini")],
    TaskType.CATEGORIZATION: [("anthropic", "haiku"), ("openai", "gpt4o-mini")],
    TaskType.CONVERSATION: [("anthropic", "sonnet"), ("openai", "gpt4o")],
    TaskType.ANALYSIS: [("anthropic", "sonnet"), ("openai", "gpt4o")],
    TaskType.REPORT_GENERATION: [("anthropic", "sonnet"), ("openai", "gpt4o")],
    TaskType.OCR_RECEIPT: [("anthropic", "sonnet"), ("openai", "gpt4o")],
    TaskType.OCR_STATEMENT: [("anthropic", "sonnet"), ("openai", "gpt4o")],
    TaskType.INSIGHT_BATCH: [("anthropic", "haiku"), ("openai", "gpt4o-mini")],
    TaskType.MEMORY_EXTRACTION: [("anthropic", "haiku"), ("openai", "gpt4o-mini")],
}

# Fallback model mapping: when primary overloads, use this
MODEL_FALLBACK: dict[str, str] = {
    "sonnet": "haiku",   # Sonnet overloaded → use Haiku
    "gpt4o": "gpt4o-mini",  # GPT-4o overloaded → use mini
}


class LLMRouter:
    """Routes LLM requests with retry, fallback, and multi-provider support."""

    def __init__(self, providers: dict[str, LLMProvider]) -> None:
        self.providers = providers
        # Sort provider names for prompt cache stability
        self._sorted_providers = sorted(providers.keys())

    async def chat(
        self,
        task: TaskType,
        messages: list[LLMMessage],
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Route a chat request with multi-layer retry and fallback."""
        model_chain = list(TASK_MODEL_CONFIG.get(task, TASK_MODEL_CONFIG[TaskType.CONVERSATION]))

        # Add registered providers not in config as fallbacks
        for pname in self._sorted_providers:
            if not any(pname == p for p, _ in model_chain):
                model_chain.append((pname, None))

        last_error: Exception | None = None

        for provider_name, model in model_chain:
            provider = self.providers.get(provider_name)
            if not provider:
                continue

            if not await provider.is_available():
                logger.warning("Provider %s not available, trying next", provider_name)
                continue

            # Determine fallback model for this provider
            fallback_model = MODEL_FALLBACK.get(model) if model else None

            try:
                response = await self._chat_with_retry(
                    provider=provider,
                    provider_name=provider_name,
                    model=model,
                    messages=messages,
                    tools=tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    fallback_model=fallback_model,
                )
                logger.info(
                    "LLM: task=%s provider=%s model=%s in=%d out=%d",
                    task, provider_name, response.model,
                    response.tokens_input, response.tokens_output,
                )
                return response

            except ModelFallbackTriggered as fb:
                # Try the fallback model on same provider
                logger.warning("Fallback: %s → %s on %s", fb.original_model, fb.suggested_fallback, provider_name)
                try:
                    response = await provider.chat(
                        messages=messages,
                        model=fb.suggested_fallback,
                        tools=tools,
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                    logger.info(
                        "LLM (fallback): task=%s provider=%s model=%s in=%d out=%d",
                        task, provider_name, response.model,
                        response.tokens_input, response.tokens_output,
                    )
                    return response
                except Exception as e2:
                    logger.error("Fallback model also failed: %s", e2)
                    last_error = e2
                    continue

            except RetryExhaustedError as re:
                logger.error("Provider %s exhausted retries for task %s", provider_name, task)
                last_error = re.last_error
                continue

            except Exception as e:
                logger.error("Provider %s failed for task %s: %s", provider_name, task, e)
                last_error = e
                continue

        # All providers failed
        if not self.providers:
            return LLMResponse(
                content="O assistente de IA nao esta disponivel de momento. Por favor, tente novamente mais tarde.",
                model="unavailable",
                tokens_input=0,
                tokens_output=0,
                finish_reason="error",
            )

        raise RuntimeError(
            f"All providers failed for task {task}: {last_error}"
        ) from last_error

    async def _chat_with_retry(
        self,
        provider: LLMProvider,
        provider_name: str,
        model: str | None,
        messages: list[LLMMessage],
        tools: list[ToolDefinition] | None,
        temperature: float,
        max_tokens: int,
        fallback_model: str | None,
    ) -> LLMResponse:
        """Execute a chat with retry logic wrapping the provider call."""

        async def _do_chat() -> LLMResponse:
            return await provider.chat(
                messages=messages,
                model=model,
                tools=tools,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        return await with_retry(
            _do_chat,
            max_retries=5,
            fallback_model=fallback_model,
            current_model=f"{provider_name}:{model}",
        )

    def get_available_providers(self) -> list[str]:
        """Return list of provider names that have API keys configured."""
        return list(self.providers.keys())
