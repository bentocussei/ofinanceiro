"""Base agent class — all agents inherit from this.

Inspired by Claude Code's tool execution pipeline:
- Real tool execution with DB operations
- Confirmation flow that doesn't break the loop
- Tool result validation and error handling
- Financial context injection in system prompts
"""

import json
import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.base import LLMMessage, LLMResponse, ToolDefinition
from app.ai.llm.router import LLMRouter, TaskType

logger = logging.getLogger(__name__)


@dataclass
class AgentContext:
    """Context passed to every agent call.

    Includes real financial data — the agent knows the user's actual situation.
    """

    user_id: uuid.UUID
    db: AsyncSession
    session_id: str
    user_facts: list[dict] = field(default_factory=list)
    conversation_history: list[LLMMessage] = field(default_factory=list)
    financial_context: str = ""
    finance_context_type: str = "personal"


@dataclass
class AgentResponse:
    """Response from an agent."""

    content: str
    agent_name: str
    tool_calls_made: list[dict] = field(default_factory=list)
    tokens_input: int = 0
    tokens_output: int = 0
    model: str = ""
    needs_confirmation: bool = False
    confirmation_data: dict | None = None


class BaseAgent:
    """Base class for all agents.

    Tool execution loop:
    1. Send message + tools to LLM
    2. If LLM returns tool_calls → execute each tool
    3. Append tool results to messages
    4. Loop back to step 1 (LLM sees results and decides next action)
    5. When LLM returns text only (no tool_calls) → return to user

    Confirmation: The LLM itself asks "Correcto?" in its text response.
    When the user confirms, the LLM calls the tool. We don't interrupt
    the loop — the LLM handles confirmation naturally.
    """

    name: str = "base"
    description: str = "Base agent"
    system_prompt_template: str = ""
    task_type: TaskType = TaskType.CONVERSATION

    def __init__(self, router: LLMRouter) -> None:
        self.router = router

    def get_tools(self) -> list[ToolDefinition]:
        """Override to return tools available to this agent."""
        return []

    def build_system_prompt(self, context: AgentContext) -> str:
        """Build the system prompt with real user context injected."""
        facts_text = ""
        if context.user_facts:
            facts_text = "\n".join(
                f"- {f.get('fact_key', '')}: {f.get('fact_value', '')}"
                for f in context.user_facts
            )

        try:
            return self.system_prompt_template.format(
                user_facts=facts_text or "Nenhum facto conhecido ainda.",
                financial_context=context.financial_context or "Dados financeiros nao disponiveis.",
                loaded_skills="",
            )
        except KeyError:
            # Fallback if template doesn't have all placeholders
            return self.system_prompt_template.replace(
                "{user_facts}", facts_text or "Nenhum facto conhecido ainda."
            ).replace(
                "{financial_context}", context.financial_context or ""
            ).replace(
                "{loaded_skills}", ""
            )

    async def process(self, message: str, context: AgentContext) -> AgentResponse:
        """Process a user message through the tool execution loop.

        The loop runs until the LLM returns a text-only response (no tool calls),
        or we hit max iterations (safety limit).
        """
        system_prompt = self.build_system_prompt(context)
        tools = self.get_tools()

        messages: list[LLMMessage] = [
            LLMMessage(role="system", content=system_prompt),
            *context.conversation_history,
            LLMMessage(role="user", content=message),
        ]

        total_input = 0
        total_output = 0
        tool_calls_made: list[dict] = []
        max_iterations = 10

        for iteration in range(max_iterations):
            # Call LLM
            try:
                response = await self.router.chat(
                    task=self.task_type,
                    messages=messages,
                    tools=tools if tools else None,
                    temperature=0.3 if iteration == 0 else 0.1,
                )
            except RuntimeError:
                if tool_calls_made:
                    # Had some success, return what we have
                    return AgentResponse(
                        content="Completei algumas accoes mas houve um erro. Verifica os resultados.",
                        agent_name=self.name,
                        tool_calls_made=tool_calls_made,
                        tokens_input=total_input,
                        tokens_output=total_output,
                    )
                raise

            total_input += response.tokens_input
            total_output += response.tokens_output

            # Check for unavailability response
            if response.model == "unavailable":
                return AgentResponse(
                    content=response.content,
                    agent_name="system",
                    tokens_input=0,
                    tokens_output=0,
                )

            # No tool calls — return the text response to user
            if not response.tool_calls:
                return AgentResponse(
                    content=response.content,
                    agent_name=self.name,
                    tool_calls_made=tool_calls_made,
                    tokens_input=total_input,
                    tokens_output=total_output,
                    model=response.model,
                )

            # Process ALL tool calls from this response
            # First, add the assistant's message (with tool_use blocks)
            messages.append(LLMMessage(
                role="assistant",
                content=response.content or "",
                tool_calls=[
                    {"id": tc.id, "name": tc.name, "arguments": tc.arguments}
                    for tc in response.tool_calls
                ],
            ))

            for tool_call in response.tool_calls:
                tool_def = next((t for t in tools if t.name == tool_call.name), None)

                if not tool_def:
                    # Unknown tool — send error back to LLM
                    result = {"error": f"Tool '{tool_call.name}' nao existe"}
                    messages.append(LLMMessage(
                        role="tool",
                        content=json.dumps(result, ensure_ascii=False),
                        tool_call_id=tool_call.id,
                        name=tool_call.name,
                    ))
                    continue

                # Execute tool
                try:
                    result = await self.execute_tool(
                        tool_call.name, tool_call.arguments, context
                    )
                except Exception as e:
                    logger.exception("Tool %s failed", tool_call.name)
                    result = {"error": f"Erro ao executar {tool_call.name}: {e!s}"}

                tool_calls_made.append({
                    "name": tool_call.name,
                    "arguments": tool_call.arguments,
                    "result": result,
                })

                # Add tool result to messages so LLM sees the outcome
                messages.append(LLMMessage(
                    role="tool",
                    content=json.dumps(result, ensure_ascii=False),
                    tool_call_id=tool_call.id,
                    name=tool_call.name,
                ))

            # Loop continues — LLM will see tool results and decide next action

        # Max iterations reached
        return AgentResponse(
            content="Desculpe, nao consegui completar o pedido. Tente novamente.",
            agent_name=self.name,
            tool_calls_made=tool_calls_made,
            tokens_input=total_input,
            tokens_output=total_output,
        )

    async def execute_tool(
        self, tool_name: str, arguments: dict, context: AgentContext
    ) -> dict:
        """Execute a tool by name. Override in subclasses."""
        return {"error": f"Tool '{tool_name}' nao implementada neste agente"}
