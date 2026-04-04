"""LLM Router: selects provider and model based on task type with automatic fallback."""

import enum
import logging

from app.ai.llm.base import LLMMessage, LLMProvider, LLMResponse, ToolDefinition

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


class LLMRouter:
    """Routes LLM requests to the appropriate provider/model based on task type.
    Implements automatic fallback on failure.
    """

    def __init__(self, providers: dict[str, LLMProvider]) -> None:
        self.providers = providers

    async def chat(
        self,
        task: TaskType,
        messages: list[LLMMessage],
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Route a chat request to the best available provider for the task."""
        model_chain = list(TASK_MODEL_CONFIG.get(task, TASK_MODEL_CONFIG[TaskType.CONVERSATION]))

        # Add any registered providers not in the config as fallbacks
        for pname in self.providers:
            if not any(pname == p for p, _ in model_chain):
                model_chain.append((pname, None))

        last_error: Exception | None = None
        for provider_name, model in model_chain:
            provider = self.providers.get(provider_name)
            if not provider:
                continue

            if not await provider.is_available():
                logger.warning("Provider %s not available, trying fallback", provider_name)
                continue

            try:
                response = await provider.chat(
                    messages=messages,
                    model=model,
                    tools=tools,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                logger.info(
                    "LLM request: task=%s provider=%s model=%s tokens_in=%d tokens_out=%d",
                    task, provider_name, response.model, response.tokens_input, response.tokens_output,
                )
                return response
            except Exception as e:
                logger.error("Provider %s failed for task %s: %s", provider_name, task, e)
                last_error = e
                continue

        raise RuntimeError(
            f"All providers failed for task {task}: {last_error}"
        ) from last_error

    def get_available_providers(self) -> list[str]:
        """Return list of provider names that have API keys configured."""
        return [name for name, provider in self.providers.items()]
