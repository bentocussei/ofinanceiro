"""Anthropic (Claude) LLM provider."""

import logging

import anthropic

from app.ai.llm.base import LLMMessage, LLMProvider, LLMResponse, ToolCall, ToolDefinition
from app.config import settings

logger = logging.getLogger(__name__)

# Model aliases
ANTHROPIC_MODELS = {
    "haiku": "claude-haiku-4-5-20251001",
    "sonnet": "claude-sonnet-4-6",
}


class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def chat(
        self,
        messages: list[LLMMessage],
        model: str | None = None,
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        model_id = ANTHROPIC_MODELS.get(model or "sonnet", model or ANTHROPIC_MODELS["sonnet"])

        # Separate system message and convert to Anthropic format
        # Anthropic requires strictly alternating user/assistant messages
        # Multiple tool results must be merged into a single user message
        system_msg = ""
        chat_messages: list[dict] = []
        for msg in messages:
            if msg.role == "system":
                system_msg = msg.content
            elif msg.role == "tool":
                # Merge consecutive tool results into one user message
                tool_result_block = {
                    "type": "tool_result",
                    "tool_use_id": msg.tool_call_id,
                    "content": msg.content,
                }
                if chat_messages and chat_messages[-1]["role"] == "user" and isinstance(chat_messages[-1]["content"], list):
                    # Append to existing user message with tool_result blocks
                    chat_messages[-1]["content"].append(tool_result_block)
                else:
                    chat_messages.append({
                        "role": "user",
                        "content": [tool_result_block],
                    })
            elif msg.role == "assistant" and msg.tool_calls:
                # Assistant message with tool_use blocks
                content_blocks: list[dict] = []
                if msg.content:
                    content_blocks.append({"type": "text", "text": msg.content})
                for tc in msg.tool_calls:
                    content_blocks.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["arguments"],
                    })
                chat_messages.append({"role": "assistant", "content": content_blocks})
            else:
                chat_messages.append({"role": msg.role, "content": msg.content})

        # Build tools for Anthropic format
        anthropic_tools = None
        if tools:
            anthropic_tools = [
                {
                    "name": t.name,
                    "description": t.description,
                    "input_schema": t.parameters,
                }
                for t in tools
            ]

        kwargs: dict = {
            "model": model_id,
            "messages": chat_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_msg:
            kwargs["system"] = system_msg
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        response = await self.client.messages.create(**kwargs)

        # Parse response
        content = ""
        tool_calls = []
        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(id=block.id, name=block.name, arguments=block.input)
                )

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            model=model_id,
            tokens_input=response.usage.input_tokens,
            tokens_output=response.usage.output_tokens,
            finish_reason=response.stop_reason or "",
        )

    async def chat_stream(
        self,
        messages: list[LLMMessage],
        model: str | None = None,
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ):
        """Stream chat response — yields text chunks as they arrive."""
        model_id = ANTHROPIC_MODELS.get(model or "sonnet", model or ANTHROPIC_MODELS["sonnet"])

        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg.role == "system":
                system_msg = msg.content
            elif msg.role == "tool":
                chat_messages.append({
                    "role": "user",
                    "content": [{"type": "tool_result", "tool_use_id": msg.tool_call_id, "content": msg.content}],
                })
            else:
                chat_messages.append({"role": msg.role, "content": msg.content})

        anthropic_tools = None
        if tools:
            anthropic_tools = [
                {"name": t.name, "description": t.description, "input_schema": t.parameters}
                for t in tools
            ]

        kwargs: dict = {
            "model": model_id,
            "messages": chat_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if system_msg:
            kwargs["system"] = system_msg
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        async with self.client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text

    async def is_available(self) -> bool:
        return bool(settings.anthropic_api_key)
