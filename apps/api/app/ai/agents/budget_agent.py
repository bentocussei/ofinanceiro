"""Budget Agent — create, check, and suggest budgets via chat."""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.models.budget import Budget
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction
from app.services.budget import get_budget_status

BUDGET_PROMPT = """És o agente de orçamentos d'O Financeiro.

REGRAS:
1. Ajuda o utilizador a criar e monitorizar orçamentos.
2. Usa sempre dados reais — chama check_budget antes de reportar.
3. Quando o utilizador pede para criar orçamento, pergunta categorias e limites.
4. Se o utilizador pede sugestão, analisa os últimos 3 meses de gastos.
5. Alerta quando categorias estão acima de 70%, 90% ou 100%.
6. Valores em Kz. Responde em Português (Angola).

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""

BUDGET_TOOLS = [
    ToolDefinition(
        name="check_budget",
        description="Ver estado actual do orçamento (quanto gastou vs limite por categoria)",
        parameters={"type": "object", "properties": {}},
    ),
    ToolDefinition(
        name="suggest_budget",
        description="Sugerir limites de orçamento com base nos gastos dos últimos 3 meses",
        parameters={"type": "object", "properties": {}},
    ),
    ToolDefinition(
        name="create_budget",
        description="Criar um novo orçamento mensal",
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nome do orçamento"},
                "total_limit": {"type": "number", "description": "Limite total em Kz"},
            },
        },
        confirm_before_execute=True,
    ),
]


class BudgetAgent(BaseAgent):
    name = "budget"
    description = "Gestão de orçamentos"
    system_prompt_template = BUDGET_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return BUDGET_TOOLS

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "check_budget":
            return await self._check_budget(context)
        if tool_name == "suggest_budget":
            return await self._suggest_budget(context)
        if tool_name == "create_budget":
            return await self._create_budget(arguments, context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _check_budget(self, ctx: AgentContext) -> dict:
        result = await ctx.db.execute(
            select(Budget).where(
                Budget.user_id == ctx.user_id,
                Budget.is_active.is_(True),
            ).order_by(Budget.period_start.desc()).limit(1)
        )
        budget = result.scalar_one_or_none()
        if not budget:
            return {"message": "Nenhum orçamento activo encontrado."}

        status = await get_budget_status(ctx.db, budget)
        return {
            "name": status.name,
            "total_spent_kz": status.total_spent / 100,
            "total_limit_kz": (status.total_limit or 0) / 100,
            "percentage": status.percentage,
            "days_remaining": status.days_remaining,
            "categories": [
                {
                    "name": item.category_name,
                    "spent_kz": item.spent / 100,
                    "limit_kz": item.limit_amount / 100,
                    "percentage": item.percentage,
                    "alert": "🔴" if item.percentage >= 100 else "🟡" if item.percentage >= 70 else "🟢",
                }
                for item in status.items
            ],
        }

    async def _suggest_budget(self, ctx: AgentContext) -> dict:
        date_from = date.today() - timedelta(days=90)
        stmt = (
            select(
                Category.name,
                func.avg(Transaction.amount).label("avg"),
                func.sum(Transaction.amount).label("total"),
            )
            .join(Category, Transaction.category_id == Category.id, isouter=True)
            .where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= date_from,
            )
            .group_by(Category.name)
            .order_by(func.sum(Transaction.amount).desc())
        )
        result = await ctx.db.execute(stmt)
        rows = result.all()

        if not rows:
            return {"message": "Sem dados suficientes. Registe transacções para obter sugestões."}

        suggestions = []
        total = 0
        for row in rows:
            monthly_avg = (row.total / 3) if row.total else 0
            suggested_limit = int(monthly_avg * 1.1)
            suggestions.append({
                "category": row.name or "Sem categoria",
                "avg_monthly_kz": monthly_avg / 100,
                "suggested_limit_kz": suggested_limit / 100,
            })
            total += suggested_limit

        return {
            "period": "Últimos 3 meses",
            "suggested_total_kz": total / 100,
            "categories": suggestions,
        }

    async def _create_budget(self, args: dict, ctx: AgentContext) -> dict:
        from app.schemas.budget import BudgetCreate
        from app.services.budget import create_budget

        now = date.today()
        start = now.replace(day=1)
        if now.month == 12:
            end = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end = now.replace(month=now.month + 1, day=1) - timedelta(days=1)

        data = BudgetCreate(
            name=args.get("name", f"Orçamento {start.strftime('%B %Y')}"),
            period_start=start,
            period_end=end,
            total_limit=int(args.get("total_limit", 0) * 100) if args.get("total_limit") else None,
        )
        budget = await create_budget(ctx.db, ctx.user_id, data)
        return {"success": True, "budget_id": str(budget.id), "name": budget.name}
