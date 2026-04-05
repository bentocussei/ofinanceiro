"""Base agent class — all agents inherit from this.

Inspired by Claude Code's tool execution pipeline:
- Real tool execution with DB operations
- Confirmation flow that doesn't break the loop
- Tool result validation and error handling
- Financial context injection in system prompts
"""

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.compact import compact_messages, needs_compaction
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
    loaded_skills: str = ""

    @property
    def family_id(self) -> uuid.UUID | None:
        """Extract family_id from finance_context_type if in family mode."""
        if self.finance_context_type.startswith("family:"):
            try:
                return uuid.UUID(self.finance_context_type.replace("family:", ""))
            except ValueError:
                pass
        return None


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

        skills_text = context.loaded_skills or ""

        try:
            return self.system_prompt_template.format(
                user_facts=facts_text or "Nenhum facto conhecido ainda.",
                financial_context=context.financial_context or "Dados financeiros nao disponiveis.",
                loaded_skills=skills_text,
            )
        except KeyError:
            return self.system_prompt_template.replace(
                "{user_facts}", facts_text or "Nenhum facto conhecido ainda."
            ).replace(
                "{financial_context}", context.financial_context or ""
            ).replace(
                "{loaded_skills}", skills_text
            )

    # Tool activity descriptions for real-time progress feedback
    TOOL_ACTIVITY: dict[str, str] = {
        "get_balance": "A consultar saldos das contas",
        "get_transactions": "A consultar transacções recentes",
        "search_transactions": "A pesquisar transacções",
        "add_transaction": "A registar transacção",
        "get_categories": "A consultar categorias disponíveis",
        "check_budget": "A verificar estado do orçamento",
        "suggest_budget": "A analisar gastos para sugerir orçamento",
        "create_budget": "A criar orçamento",
        "get_spending": "A analisar gastos por categoria",
        "get_cashflow": "A calcular fluxo de caixa",
        "can_afford": "A avaliar capacidade financeira",
        "get_goal_progress": "A consultar progresso das metas",
        "create_goal": "A criar meta de poupança",
        "simulate_goal": "A simular cenários de poupança",
        "list_debts": "A consultar dívidas activas",
        "simulate_payoff": "A simular plano de pagamento",
        "get_family_summary": "A consultar finanças familiares",
        "get_child_spending": "A consultar gastos dos dependentes",
        "get_member_contributions": "A consultar contribuições dos membros",
        "list_investments": "A consultar investimentos",
        "simulate_compound": "A simular juros compostos",
        "get_exchange_rates": "A consultar taxas de câmbio",
        "web_search": "A pesquisar na internet",
        "web_fetch": "A ler página web",
        "move_transaction": "A mover transacção entre contas",
        "generate_report": "A gerar relatório financeiro",
        "get_financial_score": "A calcular score financeiro",
    }

    def _get_tool_activity(self, tool_name: str) -> str:
        return self.TOOL_ACTIVITY.get(tool_name, f"A executar {tool_name}")

    async def process_stream(self, message: str, context: AgentContext):
        """Process a message with real-time progress events via AsyncGenerator.

        Yields dicts with:
          {"type": "progress", "content": "A consultar saldos..."}
          {"type": "text", "content": "chunk of response text"}
          {"type": "done", "response": AgentResponse}
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

        yield {"type": "progress", "content": "A analisar o teu pedido..."}

        for iteration in range(max_iterations):
            if iteration > 0 and needs_compaction(messages):
                messages = await compact_messages(self.router, messages)

            try:
                response = await self.router.chat(
                    task=self.task_type,
                    messages=messages,
                    tools=tools if tools else None,
                    temperature=0.3 if iteration == 0 else 0.1,
                )
            except RuntimeError:
                if tool_calls_made:
                    yield {"type": "done", "response": AgentResponse(
                        content="Completei algumas acções mas houve um erro.",
                        agent_name=self.name, tool_calls_made=tool_calls_made,
                        tokens_input=total_input, tokens_output=total_output,
                    )}
                    return
                raise

            total_input += response.tokens_input
            total_output += response.tokens_output

            if response.model == "unavailable":
                yield {"type": "done", "response": AgentResponse(
                    content=response.content, agent_name="system",
                )}
                return

            if not response.tool_calls:
                yield {"type": "done", "response": AgentResponse(
                    content=response.content, agent_name=self.name,
                    tool_calls_made=tool_calls_made,
                    tokens_input=total_input, tokens_output=total_output,
                    model=response.model,
                )}
                return

            messages.append(LLMMessage(
                role="assistant", content=response.content or "",
                tool_calls=[{"id": tc.id, "name": tc.name, "arguments": tc.arguments} for tc in response.tool_calls],
            ))

            abort = False
            for tc in response.tool_calls:
                tool_def = next((t for t in tools if t.name == tc.name), None)
                if not tool_def:
                    messages.append(LLMMessage(role="tool", content=json.dumps({"error": f"Tool '{tc.name}' não existe"}, ensure_ascii=False), tool_call_id=tc.id, name=tc.name))
                    continue

                if abort and not self._is_safe_tool(tc.name):
                    messages.append(LLMMessage(role="tool", content=json.dumps({"error": "Cancelado"}, ensure_ascii=False), tool_call_id=tc.id, name=tc.name))
                    continue

                # Emit real progress
                yield {"type": "progress", "content": self._get_tool_activity(tc.name)}

                try:
                    result = await self.execute_tool(tc.name, tc.arguments, context)
                except Exception as e:
                    logger.exception("Tool %s execution error", tc.name)
                    result = {"error": f"Erro ao executar {tc.name}"}
                    if not self._is_safe_tool(tc.name):
                        abort = True

                tool_calls_made.append({"name": tc.name, "arguments": tc.arguments, "result": result})
                result_str = json.dumps(result, ensure_ascii=False)
                if len(result_str) > 2000:
                    result_str = result_str[:2000] + '..."}'
                messages.append(LLMMessage(role="tool", content=result_str, tool_call_id=tc.id, name=tc.name))

            yield {"type": "progress", "content": "A preparar resposta..."}

        yield {"type": "done", "response": AgentResponse(
            content="Não consegui completar o pedido. Tente novamente.",
            agent_name=self.name, tool_calls_made=tool_calls_made,
            tokens_input=total_input, tokens_output=total_output,
        )}

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
            # Compact if context is too long
            if iteration > 0 and needs_compaction(messages):
                messages = await compact_messages(self.router, messages)

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

            # Execute ALL tool calls sequentially (shared DB session is not thread-safe)
            # Abort cascade: if one write tool fails, cancel remaining
            abort = False
            for tc in response.tool_calls:
                tool_def = next((t for t in tools if t.name == tc.name), None)
                if not tool_def:
                    result = {"error": f"Tool '{tc.name}' nao existe"}
                    messages.append(LLMMessage(
                        role="tool",
                        content=json.dumps(result, ensure_ascii=False),
                        tool_call_id=tc.id,
                        name=tc.name,
                    ))
                    continue

                if abort and not self._is_safe_tool(tc.name):
                    result = {"error": "Cancelado — operacao anterior falhou"}
                    messages.append(LLMMessage(
                        role="tool",
                        content=json.dumps(result, ensure_ascii=False),
                        tool_call_id=tc.id, name=tc.name,
                    ))
                    continue

                try:
                    result = await self.execute_tool(tc.name, tc.arguments, context)
                except Exception as e:
                    logger.exception("Tool %s execution error", tc.name)
                    result = {"error": f"Erro ao executar {tc.name}"}
                    if not self._is_safe_tool(tc.name):
                        abort = True

                tool_calls_made.append({
                    "name": tc.name, "arguments": tc.arguments, "result": result,
                })

                # Budget tool results: cap at 2000 chars
                result_str = json.dumps(result, ensure_ascii=False)
                if len(result_str) > 2000:
                    result_str = result_str[:2000] + '..."}'
                messages.append(LLMMessage(
                    role="tool", content=result_str,
                    tool_call_id=tc.id, name=tc.name,
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

    def _is_safe_tool(self, tool_name: str) -> bool:
        """Check if a tool is read-only (safe for concurrent execution).

        Delegates to the centralized ToolRegistry instead of a hardcoded set.
        """
        from app.ai.tools import ToolRegistry
        return ToolRegistry.instance().is_read_only(tool_name)

    async def _execute_concurrent(
        self, tool_calls: list, context: AgentContext
    ) -> list[dict]:
        """Execute multiple safe tools concurrently."""
        async def _run(tc) -> dict:
            try:
                return await self.execute_tool(tc.name, tc.arguments, context)
            except Exception as e:
                logger.exception("Concurrent tool %s failed", tc.name)
                return {"error": f"Erro: {e!s}"}

        results = await asyncio.gather(*[_run(tc) for tc in tool_calls])
        return list(results)

    async def execute_tool(
        self, tool_name: str, arguments: dict, context: AgentContext
    ) -> dict:
        """Execute a tool by name. Override in subclasses."""
        return {"error": f"Tool '{tool_name}' nao implementada neste agente"}
