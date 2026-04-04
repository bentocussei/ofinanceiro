"""Abstract LLM provider interface with tool calling support."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class LLMMessage:
    role: str  # "system", "user", "assistant", "tool"
    content: str
    tool_call_id: str | None = None
    name: str | None = None  # tool name for tool results
    tool_calls: list[dict] | None = None  # for assistant messages with tool_use blocks


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict  # JSON Schema
    confirm_before_execute: bool = False


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class LLMResponse:
    content: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    model: str = ""
    tokens_input: int = 0
    tokens_output: int = 0
    finish_reason: str = ""


class LLMProvider(ABC):
    """Abstract interface for LLM providers (Anthropic, OpenAI, etc.)."""

    @abstractmethod
    async def chat(
        self,
        messages: list[LLMMessage],
        model: str | None = None,
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        """Send messages to LLM and get response, optionally with tool calling."""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is available (API key set, service reachable)."""
        ...
