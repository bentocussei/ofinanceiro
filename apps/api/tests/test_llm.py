"""Tests for LLM infrastructure: providers, router, mock, tool calling."""

import pytest

from app.ai.llm.base import LLMMessage, LLMResponse, ToolDefinition
from app.ai.llm.factory import create_mock_router
from app.ai.llm.mock_provider import MockLLMProvider
from app.ai.llm.router import LLMRouter, TaskType


class TestMockProvider:
    @pytest.mark.asyncio
    async def test_basic_response(self) -> None:
        provider = MockLLMProvider()
        response = await provider.chat([LLMMessage(role="user", content="Olá")])
        assert isinstance(response, LLMResponse)
        assert response.content != ""
        assert response.tokens_input > 0

    @pytest.mark.asyncio
    async def test_custom_responses(self) -> None:
        provider = MockLLMProvider(responses={"olá": "Bem-vindo ao O Financeiro!"})
        response = await provider.chat([LLMMessage(role="user", content="Olá amigo")])
        assert response.content == "Bem-vindo ao O Financeiro!"

    @pytest.mark.asyncio
    async def test_routing_intent_tracker(self) -> None:
        provider = MockLLMProvider()
        response = await provider.chat([
            LLMMessage(role="system", content="Classifica a intenção e encaminha para o agente."),
            LLMMessage(role="user", content="Gastei 5000 no supermercado"),
        ])
        assert response.content == "TRACKER"

    @pytest.mark.asyncio
    async def test_routing_intent_advisor(self) -> None:
        provider = MockLLMProvider()
        response = await provider.chat([
            LLMMessage(role="system", content="Classifica a intenção e encaminha para o agente."),
            LLMMessage(role="user", content="Posso comprar um telemóvel novo?"),
        ])
        assert response.content == "ADVISOR"

    @pytest.mark.asyncio
    async def test_routing_intent_budget(self) -> None:
        provider = MockLLMProvider()
        response = await provider.chat([
            LLMMessage(role="system", content="Classifica a intenção e encaminha."),
            LLMMessage(role="user", content="Quanto do orçamento já gastei?"),
        ])
        assert response.content == "BUDGET"

    @pytest.mark.asyncio
    async def test_tool_calling_add_transaction(self) -> None:
        provider = MockLLMProvider()
        tools = [
            ToolDefinition(
                name="add_transaction",
                description="Registar nova transacção",
                parameters={"type": "object", "properties": {"amount": {"type": "number"}}},
            )
        ]
        response = await provider.chat(
            [LLMMessage(role="user", content="Gastei 5000 no almoço")],
            tools=tools,
        )
        assert len(response.tool_calls) == 1
        assert response.tool_calls[0].name == "add_transaction"
        assert response.finish_reason == "tool_use"

    @pytest.mark.asyncio
    async def test_tool_calling_get_balance(self) -> None:
        provider = MockLLMProvider()
        tools = [
            ToolDefinition(name="get_balance", description="Obter saldo", parameters={}),
        ]
        response = await provider.chat(
            [LLMMessage(role="user", content="Quanto tenho no saldo?")],
            tools=tools,
        )
        assert len(response.tool_calls) == 1
        assert response.tool_calls[0].name == "get_balance"

    @pytest.mark.asyncio
    async def test_is_available(self) -> None:
        provider = MockLLMProvider()
        assert await provider.is_available() is True

    @pytest.mark.asyncio
    async def test_call_tracking(self) -> None:
        provider = MockLLMProvider()
        assert provider.call_count == 0
        await provider.chat([LLMMessage(role="user", content="test")])
        assert provider.call_count == 1
        assert provider.last_call is not None
        assert provider.last_call["user_message"] == "test"


class TestLLMRouter:
    @pytest.mark.asyncio
    async def test_router_routes_to_available_provider(self) -> None:
        router = create_mock_router()
        response = await router.chat(
            TaskType.CONVERSATION,
            [LLMMessage(role="user", content="Olá")],
        )
        assert isinstance(response, LLMResponse)
        assert response.content != ""

    @pytest.mark.asyncio
    async def test_router_routing_task(self) -> None:
        router = create_mock_router()
        response = await router.chat(
            TaskType.ROUTING,
            [
                LLMMessage(role="system", content="Classifica a intenção e encaminha."),
                LLMMessage(role="user", content="Gastei 3000 em gasolina"),
            ],
        )
        assert response.content == "TRACKER"

    @pytest.mark.asyncio
    async def test_router_with_tools(self) -> None:
        router = create_mock_router()
        tools = [
            ToolDefinition(
                name="add_transaction",
                description="Registar transacção",
                parameters={"type": "object", "properties": {}},
            )
        ]
        response = await router.chat(
            TaskType.CONVERSATION,
            [LLMMessage(role="user", content="Paguei 10000 de renda")],
            tools=tools,
        )
        assert len(response.tool_calls) > 0

    @pytest.mark.asyncio
    async def test_router_no_providers_raises(self) -> None:
        router = LLMRouter({})
        with pytest.raises(RuntimeError, match="All providers failed"):
            await router.chat(
                TaskType.CONVERSATION,
                [LLMMessage(role="user", content="test")],
            )

    @pytest.mark.asyncio
    async def test_router_fallback_on_failure(self) -> None:
        """If primary provider fails, should try fallback."""

        class FailingProvider(MockLLMProvider):
            async def chat(self, **kwargs) -> LLMResponse:
                raise ConnectionError("Service unavailable")

        router = LLMRouter({
            "anthropic": FailingProvider(),
            "mock": MockLLMProvider(),
        })
        # Should succeed via fallback mock provider
        # Note: this depends on the task config having a fallback
        # For this test, we use a custom approach
        response = await router.chat(
            TaskType.CONVERSATION,
            [LLMMessage(role="user", content="Olá")],
        )
        # The mock provider should have handled it
        assert isinstance(response, LLMResponse)

    def test_get_available_providers(self) -> None:
        router = create_mock_router()
        providers = router.get_available_providers()
        assert "mock" in providers


class TestToolDefinition:
    def test_tool_with_confirm(self) -> None:
        tool = ToolDefinition(
            name="add_transaction",
            description="Registar transacção",
            parameters={"type": "object", "properties": {"amount": {"type": "number"}}},
            confirm_before_execute=True,
        )
        assert tool.confirm_before_execute is True
        assert tool.name == "add_transaction"

    def test_tool_without_confirm(self) -> None:
        tool = ToolDefinition(
            name="get_balance",
            description="Obter saldo",
            parameters={},
        )
        assert tool.confirm_before_execute is False
