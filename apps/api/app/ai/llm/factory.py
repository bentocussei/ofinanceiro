"""Factory for creating LLM providers and router."""

from typing import TYPE_CHECKING

from app.ai.llm.anthropic_provider import AnthropicProvider
from app.ai.llm.mock_provider import MockLLMProvider
from app.ai.llm.openai_provider import OpenAIProvider
from app.ai.llm.router import LLMRouter
from app.config import settings

if TYPE_CHECKING:
    from app.ai.llm.base import LLMProvider


def create_llm_router() -> LLMRouter:
    """Create LLM router with available providers.
    Uses mock provider in development when no API keys are configured.
    """
    providers: dict[str, LLMProvider] = {}

    if settings.anthropic_api_key:
        providers["anthropic"] = AnthropicProvider()

    if settings.openai_api_key:
        providers["openai"] = OpenAIProvider()

    # Fallback to mock in development if no providers configured
    if not providers and settings.environment == "development":
        providers["mock"] = MockLLMProvider()

    return LLMRouter(providers)


def create_mock_router(responses: dict[str, str] | None = None) -> LLMRouter:
    """Create a router with mock provider for testing."""
    return LLMRouter({"mock": MockLLMProvider(responses)})
