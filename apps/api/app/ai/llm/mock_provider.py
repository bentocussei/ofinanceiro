"""Mock LLM provider for development and testing."""

import uuid

from app.ai.llm.base import LLMMessage, LLMProvider, LLMResponse, ToolCall, ToolDefinition


class MockLLMProvider(LLMProvider):
    """Mock provider that returns deterministic responses for testing.
    Simulates tool calling when tools are provided.
    """

    def __init__(self, responses: dict[str, str] | None = None) -> None:
        self._responses = responses or {}
        self._calls: list[dict] = []

    async def chat(
        self,
        messages: list[LLMMessage],
        model: str | None = None,
        tools: list[ToolDefinition] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        last_user_msg = ""
        for msg in reversed(messages):
            if msg.role == "user":
                last_user_msg = msg.content.lower()
                break

        self._calls.append({
            "messages": messages,
            "model": model,
            "tools": [t.name for t in tools] if tools else [],
            "user_message": last_user_msg,
        })

        # Check custom responses first
        for pattern, response in self._responses.items():
            if pattern.lower() in last_user_msg:
                return LLMResponse(
                    content=response,
                    model=model or "mock",
                    tokens_input=len(last_user_msg),
                    tokens_output=len(response),
                    finish_reason="end_turn",
                )

        # Simulate routing responses
        if any("classifica" in m.content.lower() or "encaminha" in m.content.lower()
               for m in messages if m.role == "system"):
            agent = self._route_intent(last_user_msg)
            return LLMResponse(
                content=agent,
                model=model or "mock",
                tokens_input=50,
                tokens_output=10,
                finish_reason="end_turn",
            )

        # Simulate tool calling if tools are available
        if tools and self._should_call_tool(last_user_msg, tools):
            tool = self._select_tool(last_user_msg, tools)
            if tool:
                return LLMResponse(
                    content="",
                    tool_calls=[ToolCall(
                        id=f"call_{uuid.uuid4().hex[:8]}",
                        name=tool.name,
                        arguments=self._generate_tool_args(tool, last_user_msg),
                    )],
                    model=model or "mock",
                    tokens_input=50,
                    tokens_output=30,
                    finish_reason="tool_use",
                )

        # Default response
        return LLMResponse(
            content="Entendido. Como posso ajudar com as suas finanças?",
            model=model or "mock",
            tokens_input=50,
            tokens_output=20,
            finish_reason="end_turn",
        )

    async def is_available(self) -> bool:
        return True

    @property
    def call_count(self) -> int:
        return len(self._calls)

    @property
    def last_call(self) -> dict | None:
        return self._calls[-1] if self._calls else None

    def _route_intent(self, text: str) -> str:
        # Check more specific intents first to avoid false matches
        if any(w in text for w in ["orçamento", "limite", "budget"]):
            return "BUDGET"
        if any(w in text for w in ["gastei", "paguei", "comprei", "recebi", "salário"]):
            return "TRACKER"
        if any(w in text for w in ["posso comprar", "conselho", "análise", "gastar menos"]):
            return "ADVISOR"
        if any(w in text for w in ["meta", "poupar", "poupança"]):
            return "GOALS"
        if any(w in text for w in ["família", "agregado"]):
            return "FAMILY"
        if any(w in text for w in ["relatório", "resumo"]):
            return "REPORT"
        return "GENERAL"

    def _should_call_tool(self, text: str, tools: list[ToolDefinition]) -> bool:
        action_words = ["gastei", "paguei", "comprei", "recebi", "quanto", "saldo", "transacções"]
        return any(w in text for w in action_words)

    def _select_tool(self, text: str, tools: list[ToolDefinition]) -> ToolDefinition | None:
        tool_map = {t.name: t for t in tools}
        if any(w in text for w in ["gastei", "paguei", "comprei"]):
            return tool_map.get("add_transaction")
        if any(w in text for w in ["saldo", "quanto tenho"]):
            return tool_map.get("get_balance")
        if any(w in text for w in ["transacções", "histórico"]):
            return tool_map.get("get_transactions")
        return None

    def _generate_tool_args(self, tool: ToolDefinition, text: str) -> dict:
        if tool.name == "add_transaction":
            return {
                "amount": 500000,
                "type": "expense",
                "description": text,
                "category": "Outros",
            }
        if tool.name == "get_balance":
            return {}
        if tool.name == "get_transactions":
            return {"limit": 10}
        return {}
