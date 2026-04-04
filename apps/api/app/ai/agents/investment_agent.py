"""Investment Agent — track investments, simulate returns."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType

INVESTMENT_PROMPT = """És o agente de investimentos d'O Financeiro.

REGRAS:
1. Mostra rendimentos e projecções dos investimentos do utilizador.
2. Nunca dês conselhos de investimento específicos — sugere consultar um profissional.
3. Conhece o contexto angolano: OTs do BNA, certificados de aforro.
4. Valores em Kz. Responde em Português (Angola).

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""


class InvestmentAgent(BaseAgent):
    name = "investment"
    description = "Investimentos"
    system_prompt_template = INVESTMENT_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name="list_investments", description="Listar investimentos", parameters={"type": "object", "properties": {}}),
            ToolDefinition(
                name="simulate_compound",
                description="Simular juros compostos",
                parameters={
                    "type": "object",
                    "properties": {
                        "principal": {"type": "number", "description": "Capital inicial em Kz"},
                        "monthly": {"type": "number", "description": "Contribuição mensal em Kz"},
                        "rate": {"type": "number", "description": "Taxa anual %"},
                        "years": {"type": "integer", "description": "Período em anos"},
                    },
                    "required": ["principal", "rate", "years"],
                },
            ),
        ]

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "list_investments":
            from sqlalchemy import select

            from app.models.investment import Investment

            result = await context.db.execute(
                select(Investment).where(Investment.user_id == context.user_id, Investment.is_active.is_(True))
            )
            investments = result.scalars().all()
            return {
                "investments": [
                    {"name": i.name, "invested_kz": i.invested_amount / 100, "current_kz": i.current_value / 100}
                    for i in investments
                ]
            }
        if tool_name == "simulate_compound":
            principal = int(arguments.get("principal", 0) * 100)
            monthly = int(arguments.get("monthly", 0) * 100)
            rate = arguments.get("rate", 12) / 100 / 12
            months = arguments.get("years", 5) * 12

            balance = principal
            for _ in range(months):
                balance = int(balance * (1 + rate)) + monthly

            return {"final_kz": balance / 100, "invested_kz": (principal + monthly * months) / 100, "profit_kz": (balance - principal - monthly * months) / 100}
        return {"error": "Tool desconhecida"}
