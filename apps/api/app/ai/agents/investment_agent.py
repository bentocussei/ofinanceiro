"""Investment Agent — track investments, simulate returns."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry

INVESTMENT_TOOLS = [
    ToolMeta(name="list_investments", description="Listar todos os investimentos com valor investido, valor actual e rendimento",
             parameters={"type": "object", "properties": {}},
             agent="investment", category="query", read_only=True),
    ToolMeta(name="simulate_compound", description="Simular juros compostos — mostra projecao de crescimento do investimento",
             parameters={"type": "object", "properties": {"principal": {"type": "number", "description": "Capital inicial em centavos"}, "monthly": {"type": "number", "description": "Contribuicao mensal em centavos"}, "rate": {"type": "number", "description": "Taxa anual em percentagem (ex: 12 para 12%)"}, "years": {"type": "integer", "description": "Periodo em anos"}}, "required": ["principal", "rate", "years"]},
             agent="investment", category="compute", read_only=True),
]
ToolRegistry.instance().register_many(INVESTMENT_TOOLS)

INVESTMENT_PROMPT = """Es o agente de investimentos d'O Financeiro.

REGRAS:
1. Mostra rendimentos e projeccoes dos investimentos do utilizador.
2. Nunca des conselhos de investimento especificos — sugere consultar um profissional.
3. Conhece o contexto angolano: OTs do BNA, certificados de aforro, depositos a prazo.
4. Valores em Kz. Responde em Portugues (Angola). Não uses emojis. Usa sempre acentuação correcta (Março, família, orçamento).
5. Usa os DADOS FINANCEIROS REAIS para dar informacao personalizada.
6. Quando o utilizador perguntar sobre investimentos, usa list_investments.

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
        return ToolRegistry.instance().get_tools_for_agent("investment")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "list_investments":
            from sqlalchemy import select
            from app.models.investment import Investment

            result = await context.db.execute(
                select(Investment).where(
                    Investment.user_id == context.user_id,
                    Investment.is_active.is_(True),
                )
            )
            investments = result.scalars().all()
            if not investments:
                return {"investments": [], "message": "Nenhum investimento registado"}

            total_invested = sum(i.invested_amount for i in investments)
            total_current = sum(i.current_value for i in investments)
            total_profit = total_current - total_invested

            return {
                "total_invested_kz": total_invested / 100,
                "total_current_kz": total_current / 100,
                "total_profit_kz": total_profit / 100,
                "profit_pct": round(total_profit / total_invested * 100, 1) if total_invested > 0 else 0,
                "investments": [
                    {
                        "name": i.name,
                        "type": i.type or "—",
                        "institution": i.institution or "—",
                        "invested_kz": i.invested_amount / 100,
                        "current_kz": i.current_value / 100,
                        "profit_kz": (i.current_value - i.invested_amount) / 100,
                        "rate_pct": (i.interest_rate or 0) / 100,
                    }
                    for i in investments
                ],
            }

        if tool_name == "simulate_compound":
            principal = int(arguments.get("principal", 0))
            monthly = int(arguments.get("monthly", 0))
            annual_rate = arguments.get("rate", 12)
            years = arguments.get("years", 5)

            monthly_rate = annual_rate / 100 / 12
            months = years * 12

            balance = principal
            for _ in range(months):
                balance = int(balance * (1 + monthly_rate)) + monthly

            total_contributed = principal + monthly * months
            profit = balance - total_contributed

            return {
                "projecao": {
                    "capital_inicial_kz": principal / 100,
                    "contribuicao_mensal_kz": monthly / 100,
                    "taxa_anual_pct": annual_rate,
                    "periodo_anos": years,
                    "valor_final_kz": balance / 100,
                    "total_investido_kz": total_contributed / 100,
                    "lucro_kz": profit / 100,
                    "lucro_pct": round(profit / total_contributed * 100, 1) if total_contributed > 0 else 0,
                },
            }

        return {"error": f"Tool '{tool_name}' nao implementada"}
