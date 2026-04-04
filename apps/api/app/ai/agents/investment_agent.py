"""Investment Agent — track investments, simulate returns."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry

INVESTMENT_TOOLS = [
    ToolMeta(name="list_investments", description="Listar todos os investimentos com valor investido, valor actual e rendimento",
             parameters={"type": "object", "properties": {}},
             agent="investment", category="query", read_only=True),
    ToolMeta(name="simulate_compound", description="Simular juros compostos — mostra projecção de crescimento do investimento",
             parameters={"type": "object", "properties": {"principal": {"type": "number", "description": "Capital inicial em Kz"}, "monthly": {"type": "number", "description": "Contribuição mensal em Kz"}, "rate": {"type": "number", "description": "Taxa anual em percentagem (ex: 12 para 12%)"}, "years": {"type": "integer", "description": "Período em anos"}}, "required": ["principal", "rate", "years"]},
             agent="investment", category="compute", read_only=True),
    ToolMeta(name="create_investment", description="Registar um novo investimento",
             parameters={"type": "object", "properties": {"name": {"type": "string", "description": "Nome do investimento"}, "type": {"type": "string", "description": "Tipo: deposit, bond, stock, crypto, real_estate"}, "institution": {"type": "string", "description": "Instituição (ex: BFA, BAI)"}, "invested_amount": {"type": "number", "description": "Valor investido em Kz"}, "current_value": {"type": "number", "description": "Valor actual em Kz"}, "interest_rate": {"type": "number", "description": "Taxa anual em % (ex: 12)"}}, "required": ["name", "type", "invested_amount", "current_value"]},
             agent="investment", category="action", read_only=False),
    ToolMeta(name="update_investment", description="Editar um investimento existente (valor actual, taxa, notas)",
             parameters={"type": "object", "properties": {"investment_id": {"type": "string", "description": "UUID do investimento"}, "current_value": {"type": "number", "description": "Novo valor actual em Kz"}, "interest_rate": {"type": "number", "description": "Nova taxa anual em %"}, "notes": {"type": "string"}}, "required": ["investment_id"]},
             agent="investment", category="action", read_only=False),
    ToolMeta(name="delete_investment", description="Eliminar um investimento",
             parameters={"type": "object", "properties": {"investment_id": {"type": "string", "description": "UUID do investimento a eliminar"}}, "required": ["investment_id"]},
             agent="investment", category="action", read_only=False),
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
            from app.services.investment import list_investments

            investments = await list_investments(context.db, context.user_id)
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
                        "id": str(i.id),
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

        if tool_name == "create_investment":
            from app.schemas.investment import InvestmentCreate
            from app.services.investment import create_investment

            data = InvestmentCreate(
                name=arguments["name"],
                type=arguments["type"],
                institution=arguments.get("institution"),
                invested_amount=int(arguments["invested_amount"] * 100),
                current_value=int(arguments["current_value"] * 100),
                interest_rate=int(arguments["interest_rate"] * 100) if arguments.get("interest_rate") else None,
            )
            inv = await create_investment(context.db, context.user_id, data)
            await context.db.commit()
            return {"success": True, "investment_id": str(inv.id), "name": inv.name}

        if tool_name == "update_investment":
            import uuid as _uuid
            from app.schemas.investment import InvestmentUpdate
            from app.services.investment import get_investment, update_investment

            try:
                inv_id = _uuid.UUID(arguments["investment_id"])
            except (ValueError, KeyError):
                return {"error": "investment_id inválido"}

            inv = await get_investment(context.db, inv_id, context.user_id)
            if not inv:
                return {"error": "Investimento não encontrado"}

            update_data: dict = {}
            if "current_value" in arguments:
                update_data["current_value"] = int(arguments["current_value"] * 100)
            if "interest_rate" in arguments:
                update_data["interest_rate"] = int(arguments["interest_rate"] * 100)
            if "notes" in arguments:
                update_data["notes"] = arguments["notes"]

            data = InvestmentUpdate(**update_data)
            inv = await update_investment(context.db, inv, data)
            await context.db.commit()
            return {"success": True, "investment_id": str(inv.id), "name": inv.name, "current_value_kz": inv.current_value / 100}

        if tool_name == "delete_investment":
            import uuid as _uuid
            from app.services.investment import get_investment, delete_investment

            try:
                inv_id = _uuid.UUID(arguments["investment_id"])
            except (ValueError, KeyError):
                return {"error": "investment_id inválido"}

            inv = await get_investment(context.db, inv_id, context.user_id)
            if not inv:
                return {"error": "Investimento não encontrado"}

            name = inv.name
            await delete_investment(context.db, inv)
            await context.db.commit()
            return {"success": True, "deleted": name}

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
