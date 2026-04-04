"""Debt Agent — manage debts, simulate payoff, suggest strategies."""

import math

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry

DEBT_PROMPT = """Es o agente de gestao de dividas d'O Financeiro.

REGRAS:
1. Ajuda a gerir e pagar dividas mais rapidamente.
2. Sugere estrategias: avalanche (maior taxa primeiro) ou snowball (menor saldo primeiro).
3. Nunca julga — se encorajador e motivador.
4. Valores em Kz. Responde em Portugues (Angola). Não uses emojis. Usa sempre acentuação correcta (Março, família, orçamento).
5. Usa os DADOS FINANCEIROS REAIS para dar conselhos personalizados.
6. Quando o utilizador perguntar sobre as suas dividas, usa a tool list_debts.
7. Quando pedir simulacao, usa simulate_payoff com os dados reais.

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""


DEBT_TOOLS = [
    ToolMeta(name="list_debts", description="Listar dívidas activas com saldo, taxa e pagamento mensal",
             parameters={"type": "object", "properties": {}},
             agent="debt", category="query", read_only=True),
    ToolMeta(name="simulate_payoff", description="Simular aceleração de pagamento — mostra tempo e juros poupados com pagamento extra",
             parameters={"type": "object", "properties": {"debt_name": {"type": "string", "description": "Nome da dívida para simular"}, "extra_monthly": {"type": "number", "description": "Valor extra mensal em Kz"}}, "required": ["extra_monthly"]},
             agent="debt", category="compute", read_only=True),
    ToolMeta(name="create_debt", description="Registar uma nova dívida",
             parameters={"type": "object", "properties": {"name": {"type": "string", "description": "Nome da dívida"}, "creditor": {"type": "string", "description": "Credor"}, "original_amount": {"type": "number", "description": "Valor original em Kz"}, "current_balance": {"type": "number", "description": "Saldo actual em Kz"}, "interest_rate": {"type": "number", "description": "Taxa anual em % (ex: 15 para 15%)"}, "monthly_payment": {"type": "number", "description": "Pagamento mensal em Kz"}, "payment_day": {"type": "integer", "description": "Dia do pagamento (1-31)"}}, "required": ["name", "original_amount", "current_balance"]},
             agent="debt", category="action", read_only=False),
    ToolMeta(name="update_debt", description="Editar uma dívida existente (saldo, pagamento, notas)",
             parameters={"type": "object", "properties": {"debt_id": {"type": "string", "description": "UUID da dívida"}, "current_balance": {"type": "number", "description": "Novo saldo em Kz"}, "monthly_payment": {"type": "number", "description": "Novo pagamento mensal em Kz"}, "notes": {"type": "string", "description": "Notas"}}, "required": ["debt_id"]},
             agent="debt", category="action", read_only=False),
    ToolMeta(name="delete_debt", description="Eliminar uma dívida",
             parameters={"type": "object", "properties": {"debt_id": {"type": "string", "description": "UUID da dívida a eliminar"}}, "required": ["debt_id"]},
             agent="debt", category="action", read_only=False),
]
ToolRegistry.instance().register_many(DEBT_TOOLS)


class DebtAgent(BaseAgent):
    name = "debt"
    description = "Gestao de dividas"
    system_prompt_template = DEBT_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return ToolRegistry.instance().get_tools_for_agent("debt")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "list_debts":
            from app.services.debt import list_debts

            debts = await list_debts(context.db, context.user_id)
            if not debts:
                return {"debts": [], "message": "Nenhuma dívida activa registada"}

            total = sum(d.current_balance for d in debts)
            return {
                "total_dividas_kz": total / 100,
                "quantidade": len(debts),
                "debts": [
                    {
                        "id": str(d.id),
                        "name": d.name,
                        "balance_kz": d.current_balance / 100,
                        "monthly_payment_kz": (d.monthly_payment or 0) / 100,
                        "interest_rate_pct": (d.interest_rate or 0) / 100,
                        "type": d.type.value if hasattr(d.type, "value") else str(d.type),
                        "creditor": d.creditor or "—",
                    }
                    for d in debts
                ],
            }

        if tool_name == "create_debt":
            from app.schemas.debt import DebtCreate
            from app.services.debt import create_debt

            data = DebtCreate(
                name=arguments["name"],
                creditor=arguments.get("creditor"),
                original_amount=int(arguments["original_amount"] * 100),
                current_balance=int(arguments["current_balance"] * 100),
                interest_rate=int(arguments["interest_rate"] * 100) if arguments.get("interest_rate") else None,
                monthly_payment=int(arguments["monthly_payment"] * 100) if arguments.get("monthly_payment") else None,
                payment_day=arguments.get("payment_day"),
            )
            debt = await create_debt(context.db, context.user_id, data)
            await context.db.commit()
            return {"success": True, "debt_id": str(debt.id), "name": debt.name}

        if tool_name == "update_debt":
            import uuid as _uuid
            from app.schemas.debt import DebtUpdate
            from app.services.debt import get_debt, update_debt

            try:
                debt_id = _uuid.UUID(arguments["debt_id"])
            except (ValueError, KeyError):
                return {"error": "debt_id inválido"}

            debt = await get_debt(context.db, debt_id, context.user_id)
            if not debt:
                return {"error": "Dívida não encontrada"}

            update_data: dict = {}
            if "current_balance" in arguments:
                update_data["current_balance"] = int(arguments["current_balance"] * 100)
            if "monthly_payment" in arguments:
                update_data["monthly_payment"] = int(arguments["monthly_payment"] * 100)
            if "notes" in arguments:
                update_data["notes"] = arguments["notes"]

            data = DebtUpdate(**update_data)
            debt = await update_debt(context.db, debt, data)
            await context.db.commit()
            return {"success": True, "debt_id": str(debt.id), "name": debt.name, "balance_kz": debt.current_balance / 100}

        if tool_name == "delete_debt":
            import uuid as _uuid
            from app.services.debt import get_debt, delete_debt

            try:
                debt_id = _uuid.UUID(arguments["debt_id"])
            except (ValueError, KeyError):
                return {"error": "debt_id inválido"}

            debt = await get_debt(context.db, debt_id, context.user_id)
            if not debt:
                return {"error": "Dívida não encontrada"}

            name = debt.name
            await delete_debt(context.db, debt)
            await context.db.commit()
            return {"success": True, "deleted": name}

        if tool_name == "simulate_payoff":
            from sqlalchemy import select
            from app.models.debt import Debt

            debt_name = arguments.get("debt_name", "")
            extra = arguments.get("extra_monthly", 0)

            # Find the debt
            result = await context.db.execute(
                select(Debt).where(Debt.user_id == context.user_id, Debt.is_active.is_(True))
            )
            debts = result.scalars().all()

            # Match by name (partial)
            debt = None
            for d in debts:
                if debt_name and debt_name.lower() in d.name.lower():
                    debt = d
                    break
            if not debt and debts:
                debt = debts[0]  # Use first debt if no match

            if not debt:
                return {"error": "Nenhuma divida encontrada para simular"}

            balance = debt.current_balance
            monthly = debt.monthly_payment or 0
            rate = (debt.interest_rate or 0) / 10000  # stored as basis points

            # Simulate normal payoff
            normal_months = _simulate_months(balance, monthly, rate)
            normal_interest = _total_interest(balance, monthly, rate, normal_months)

            # Simulate with extra payment
            accelerated_months = _simulate_months(balance, monthly + extra, rate)
            accelerated_interest = _total_interest(balance, monthly + extra, rate, accelerated_months)

            return {
                "debt_name": debt.name,
                "balance_kz": balance / 100,
                "normal": {
                    "monthly_kz": monthly / 100,
                    "months": normal_months,
                    "total_interest_kz": normal_interest / 100,
                },
                "accelerated": {
                    "monthly_kz": (monthly + extra) / 100,
                    "extra_kz": extra / 100,
                    "months": accelerated_months,
                    "total_interest_kz": accelerated_interest / 100,
                },
                "savings": {
                    "months_saved": normal_months - accelerated_months,
                    "interest_saved_kz": (normal_interest - accelerated_interest) / 100,
                },
            }

        return {"error": f"Tool '{tool_name}' nao implementada"}


def _simulate_months(balance: int, monthly: int, monthly_rate: float) -> int:
    """Calculate months to pay off a debt."""
    if monthly <= 0:
        return 999
    if monthly_rate <= 0:
        return max(1, math.ceil(balance / monthly))

    remaining = balance
    months = 0
    while remaining > 0 and months < 600:
        interest = int(remaining * monthly_rate)
        remaining = remaining + interest - monthly
        months += 1
    return months


def _total_interest(balance: int, monthly: int, monthly_rate: float, months: int) -> int:
    """Calculate total interest paid over the payoff period."""
    if monthly_rate <= 0:
        return 0
    total_paid = monthly * months
    return max(0, total_paid - balance)
