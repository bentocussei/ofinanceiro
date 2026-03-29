"""Debt Agent — manage debts, simulate payoff, suggest strategies."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType

DEBT_PROMPT = """És o agente de gestão de dívidas d'O Financeiro.

REGRAS:
1. Ajuda a gerir e pagar dívidas mais rapidamente.
2. Sugere estratégias: avalanche (maior taxa primeiro) ou snowball (menor saldo primeiro).
3. Nunca julga — sê encorajador.
4. Valores em Kz. Responde em Português (Angola).

FACTOS DO UTILIZADOR:
{user_facts}

{loaded_skills}"""


class DebtAgent(BaseAgent):
    name = "debt"
    description = "Gestão de dívidas"
    system_prompt_template = DEBT_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name="list_debts", description="Listar dívidas activas", parameters={"type": "object", "properties": {}}),
            ToolDefinition(
                name="simulate_payoff",
                description="Simular aceleração de pagamento de dívida",
                parameters={
                    "type": "object",
                    "properties": {
                        "extra_monthly": {"type": "number", "description": "Valor extra mensal em Kz"},
                    },
                },
            ),
        ]

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "list_debts":
            from sqlalchemy import select

            from app.models.debt import Debt

            result = await context.db.execute(
                select(Debt).where(Debt.user_id == context.user_id, Debt.is_active.is_(True))
            )
            debts = result.scalars().all()
            return {
                "debts": [
                    {"name": d.name, "balance_kz": d.current_balance / 100, "rate": (d.interest_rate or 0) / 100}
                    for d in debts
                ]
            }
        return {"error": "Tool desconhecida"}
