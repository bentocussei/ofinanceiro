"""Base agent class — all agents inherit from this."""

import uuid
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.base import LLMMessage, ToolDefinition
from app.ai.llm.router import LLMRouter, TaskType


@dataclass
class AgentContext:
    """Context passed to every agent call."""

    user_id: uuid.UUID
    db: AsyncSession
    session_id: str
    user_facts: list[dict] = field(default_factory=list)
    conversation_history: list[LLMMessage] = field(default_factory=list)


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
    """Base class for all agents. Subclass and override system_prompt, tools, and task_type."""

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
        """Build the system prompt with user context injected."""
        facts_text = ""
        if context.user_facts:
            facts_text = "\n".join(
                f"- {f.get('fact_key', '')}: {f.get('fact_value', '')}"
                for f in context.user_facts
            )

        return self.system_prompt_template.format(
            user_facts=facts_text or "Nenhum facto conhecido ainda.",
            loaded_skills="",
        )

    async def process(self, message: str, context: AgentContext) -> AgentResponse:
        """Process a user message. Handles tool call loops."""
        system_prompt = self.build_system_prompt(context)
        tools = self.get_tools()

        messages = [
            LLMMessage(role="system", content=system_prompt),
            *context.conversation_history,
            LLMMessage(role="user", content=message),
        ]

        total_input = 0
        total_output = 0
        tool_calls_made = []
        max_iterations = 10

        for _ in range(max_iterations):
            response = await self.router.chat(
                task=self.task_type,
                messages=messages,
                tools=tools if tools else None,
            )
            total_input += response.tokens_input
            total_output += response.tokens_output

            if not response.tool_calls:
                # No tool calls — return the text response
                return AgentResponse(
                    content=response.content,
                    agent_name=self.name,
                    tool_calls_made=tool_calls_made,
                    tokens_input=total_input,
                    tokens_output=total_output,
                    model=response.model,
                )

            # Process tool calls
            for tool_call in response.tool_calls:
                tool_def = next((t for t in tools if t.name == tool_call.name), None)

                # Check if confirmation is needed
                if tool_def and tool_def.confirm_before_execute:
                    return AgentResponse(
                        content=f"Quero executar: {tool_call.name}",
                        agent_name=self.name,
                        tool_calls_made=tool_calls_made,
                        tokens_input=total_input,
                        tokens_output=total_output,
                        model=response.model,
                        needs_confirmation=True,
                        confirmation_data={
                            "tool_call_id": tool_call.id,
                            "tool_name": tool_call.name,
                            "arguments": tool_call.arguments,
                        },
                    )

                # Execute tool
                result = await self.execute_tool(tool_call.name, tool_call.arguments, context)
                tool_calls_made.append({
                    "name": tool_call.name,
                    "arguments": tool_call.arguments,
                    "result": result,
                })

                # Add assistant message with tool call and tool result to conversation
                messages.append(LLMMessage(role="assistant", content=response.content or ""))
                messages.append(LLMMessage(
                    role="tool",
                    content=str(result),
                    tool_call_id=tool_call.id,
                    name=tool_call.name,
                ))

        # Max iterations reached
        return AgentResponse(
            content="Desculpe, não consegui completar o pedido. Tente novamente.",
            agent_name=self.name,
            tool_calls_made=tool_calls_made,
            tokens_input=total_input,
            tokens_output=total_output,
        )

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        """Execute a tool by name. Override in subclasses to add tool implementations."""
        return {"error": f"Tool '{tool_name}' não implementada"}
