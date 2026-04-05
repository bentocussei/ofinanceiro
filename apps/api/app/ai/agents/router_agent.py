"""Router Agent — classifies user intent and routes to the correct specialist agent."""

from app.ai.llm.base import LLMMessage
from app.ai.llm.router import LLMRouter, TaskType

ROUTER_SYSTEM_PROMPT = """Classifica a intenção do utilizador e encaminha para o agente correcto.

Agentes disponíveis:
- TRACKER: Registar, editar, mover ou eliminar transacção, consultar gastos, pesquisar histórico, saldo
- BUDGET: Criar/consultar orçamento, alertas de limite
- ADVISOR: Conselhos financeiros, análise de gastos, "posso comprar?"
- GOALS: Metas de poupança, progresso, recomendações
- FAMILY: Finanças familiares, contribuições, gastos por membro
- REPORT: Relatórios, resumos, comparações
- DEBT: Dívidas, empréstimos, amortização
- INVESTMENT: Investimentos, simulações, rendimentos
- NEWS: Notícias financeiras, câmbio, inflação
- GENERAL: Saudações, perguntas sobre a app, configurações, outros

Responde APENAS com o nome do agente. Nada mais. Sem explicação."""

VALID_AGENTS = {
    "TRACKER", "BUDGET", "ADVISOR", "GOALS", "FAMILY",
    "REPORT", "DEBT", "INVESTMENT", "NEWS", "GENERAL",
}


class RouterAgent:
    """Routes user messages to the appropriate specialist agent."""

    def __init__(self, router: LLMRouter) -> None:
        self.router = router

    async def classify_intent(self, message: str) -> str:
        """Classify user intent and return agent name."""
        response = await self.router.chat(
            task=TaskType.ROUTING,
            messages=[
                LLMMessage(role="system", content=ROUTER_SYSTEM_PROMPT),
                LLMMessage(role="user", content=message),
            ],
            temperature=0.0,
            max_tokens=20,
        )

        agent_name = response.content.strip().upper()

        # Validate
        if agent_name not in VALID_AGENTS:
            return "GENERAL"

        return agent_name
