"""Factory for creating LLM providers and router."""

import logging
from typing import TYPE_CHECKING

from app.ai.llm.anthropic_provider import AnthropicProvider
from app.ai.llm.openai_provider import OpenAIProvider
from app.ai.llm.router import LLMRouter
from app.config import settings

if TYPE_CHECKING:
    from app.ai.llm.base import LLMProvider

logger = logging.getLogger(__name__)


def create_llm_router() -> LLMRouter:
    """Create LLM router with available providers.

    Requires at least one API key (ANTHROPIC_API_KEY or OPENAI_API_KEY).
    Without keys, the router returns an unavailability message.
    """
    providers: dict[str, LLMProvider] = {}

    if settings.anthropic_api_key:
        providers["anthropic"] = AnthropicProvider()
        logger.info("LLM provider registered: Anthropic (Claude)")

    if settings.openai_api_key:
        providers["openai"] = OpenAIProvider()
        logger.info("LLM provider registered: OpenAI")

    if not providers:
        logger.warning(
            "No LLM API keys configured. AI assistant will return "
            "unavailability message."
        )

    return LLMRouter(providers)
