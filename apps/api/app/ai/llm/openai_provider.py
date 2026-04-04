"""OpenAI (GPT) LLM provider."""

import json
import logging

import openai

from app.ai.llm.base import LLMMessage, LLMProvider, LLMResponse, ToolCall, ToolDefinition
from app.config import settings

logger = logging.getLogger(__name__)

OPENAI_MODELS = {
    "gpt4o": "gpt-4o",
    "gpt4o-mini": "gpt-4o-mini",
}


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    async def chat(
        self,
        messages: list[LLMMessage],
        model: str | None = None,
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        model_id = OPENAI_MODELS.get(model or "gpt4o", model or OPENAI_MODELS["gpt4o"])

        # Convert messages to OpenAI format
        oai_messages = []
        for msg in messages:
            if msg.role == "tool":
                oai_messages.append({
                    "role": "tool",
                    "tool_call_id": msg.tool_call_id,
                    "content": msg.content,
                })
            elif msg.role == "assistant" and msg.tool_calls:
                # Assistant message with tool_calls
                oai_msg: dict = {"role": "assistant", "content": msg.content or ""}
                oai_msg["tool_calls"] = [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["arguments"]),
                        },
                    }
                    for tc in msg.tool_calls
                ]
                oai_messages.append(oai_msg)
            else:
                oai_messages.append({"role": msg.role, "content": msg.content})

        # Build tools for OpenAI format
        oai_tools = None
        if tools:
            oai_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": t.name,
                        "description": t.description,
                        "parameters": t.parameters,
                    },
                }
                for t in tools
            ]

        kwargs: dict = {
            "model": model_id,
            "messages": oai_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if oai_tools:
            kwargs["tools"] = oai_tools

        response = await self.client.chat.completions.create(**kwargs)

        choice = response.choices[0]
        content = choice.message.content or ""
        tool_calls = []

        if choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=json.loads(tc.function.arguments),
                    )
                )

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            model=model_id,
            tokens_input=response.usage.prompt_tokens if response.usage else 0,
            tokens_output=response.usage.completion_tokens if response.usage else 0,
            finish_reason=choice.finish_reason or "",
        )

    async def is_available(self) -> bool:
        return bool(settings.openai_api_key)
