"""Advisor Agent — financial advice, spending analysis, "can I afford this?"."""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.models.account import Account
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction

ADVISOR_PROMPT = """És o consultor financeiro pessoal d'O Financeiro.

REGRAS:
1. Usa SEMPRE dados reais do utilizador — nunca inventes números.
2. Chama get_spending e get_balance ANTES de dar conselhos.
3. Sê específico: "Podes poupar 15.000 Kz/mês se reduzires Uber em 40%" — não "tenta gastar menos."
4. Quando o utilizador pergunta "posso comprar X?", calcula o impacto real no orçamento e saldo.
5. Conhece o contexto angolano: custos de vida em Luanda, taxas de câmbio, inflação.
6. Nunca dês conselhos de investimento específicos — sugere que consulte um profissional.
7. Tom: directo e honesto, sem ser condescendente.
8. Responde sempre em Português (Angola). Nao uses emojis.
9. Valores sempre em Kz com formatação: "150.000 Kz".

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

SKILLS:
{loaded_skills}"""

ADVISOR_TOOLS = [
    ToolDefinition(
        name="get_spending",
        description="Obter gastos por categoria num período (default: último mês)",
        parameters={
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Número de dias para analisar (default: 30)"},
            },
        },
    ),
    ToolDefinition(
        name="get_balance",
        description="Obter saldo total e por conta",
        parameters={"type": "object", "properties": {}},
    ),
    ToolDefinition(
        name="get_cashflow",
        description="Obter fluxo de caixa (receitas vs despesas) num período",
        parameters={
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Número de dias (default: 30)"},
            },
        },
    ),
    ToolDefinition(
        name="can_afford",
        description="Calcular se o utilizador pode comprar algo com base no saldo e gastos médios",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Valor em Kz do que quer comprar"},
                "description": {"type": "string", "description": "O que quer comprar"},
            },
            "required": ["amount"],
        },
    ),
]


class AdvisorAgent(BaseAgent):
    name = "advisor"
    description = "Conselhos financeiros e análise de gastos"
    system_prompt_template = ADVISOR_PROMPT
    task_type = TaskType.ANALYSIS

    def get_tools(self) -> list[ToolDefinition]:
        return ADVISOR_TOOLS

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "get_spending":
            return await self._get_spending(arguments, context)
        if tool_name == "get_balance":
            return await self._get_balance(context)
        if tool_name == "get_cashflow":
            return await self._get_cashflow(arguments, context)
        if tool_name == "can_afford":
            return await self._can_afford(arguments, context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _get_spending(self, args: dict, ctx: AgentContext) -> dict:
        days = args.get("days", 30)
        date_from = date.today() - timedelta(days=days)

        stmt = (
            select(
                Category.name,
                Category.icon,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .join(Category, Transaction.category_id == Category.id, isouter=True)
            .where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= date_from,
            )
            .group_by(Category.name, Category.icon)
            .order_by(func.sum(Transaction.amount).desc())
        )

        result = await ctx.db.execute(stmt)
        rows = result.all()

        total = sum(r.total for r in rows)
        categories = [
            {
                "category": r.name or "Sem categoria",
                "icon": r.icon,
                "total_kz": r.total / 100,
                "count": r.count,
                "percentage": round((r.total / total * 100) if total > 0 else 0, 1),
            }
            for r in rows
        ]

        return {
            "period_days": days,
            "total_spending_kz": total / 100,
            "categories": categories,
        }

    async def _get_balance(self, ctx: AgentContext) -> dict:
        result = await ctx.db.execute(
            select(Account.name, Account.type, Account.balance)
            .where(Account.user_id == ctx.user_id, Account.is_archived.is_(False))
        )
        accounts = result.all()
        total = sum(a.balance for a in accounts)

        return {
            "total_balance_kz": total / 100,
            "accounts": [
                {"name": a.name, "type": a.type, "balance_kz": a.balance / 100}
                for a in accounts
            ],
        }

    async def _get_cashflow(self, args: dict, ctx: AgentContext) -> dict:
        days = args.get("days", 30)
        date_from = date.today() - timedelta(days=days)

        stmt = (
            select(
                Transaction.type,
                func.sum(Transaction.amount).label("total"),
                func.count(Transaction.id).label("count"),
            )
            .where(
                Transaction.user_id == ctx.user_id,
                Transaction.transaction_date >= date_from,
            )
            .group_by(Transaction.type)
        )

        result = await ctx.db.execute(stmt)
        rows = result.all()

        income = 0
        expense = 0
        for row in rows:
            if row.type == TransactionType.INCOME:
                income = row.total
            elif row.type == TransactionType.EXPENSE:
                expense = row.total

        return {
            "period_days": days,
            "income_kz": income / 100,
            "expense_kz": expense / 100,
            "net_kz": (income - expense) / 100,
            "savings_rate": round((income - expense) / income * 100, 1) if income > 0 else 0,
        }

    async def _can_afford(self, args: dict, ctx: AgentContext) -> dict:
        amount_kz = args.get("amount", 0)
        description = args.get("description", "item")

        # Get current balance
        result = await ctx.db.execute(
            select(func.sum(Account.balance))
            .where(Account.user_id == ctx.user_id, Account.is_archived.is_(False))
        )
        total_balance = result.scalar() or 0

        # Get average monthly expenses (last 30 days)
        date_from = date.today() - timedelta(days=30)
        result = await ctx.db.execute(
            select(func.sum(Transaction.amount))
            .where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= date_from,
            )
        )
        monthly_expense = result.scalar() or 0

        amount_centavos = int(amount_kz * 100)
        balance_after = total_balance - amount_centavos
        can_afford = balance_after > monthly_expense  # Can still cover next month's expenses

        return {
            "item": description,
            "item_cost_kz": amount_kz,
            "current_balance_kz": total_balance / 100,
            "balance_after_kz": balance_after / 100,
            "monthly_expense_kz": monthly_expense / 100,
            "can_afford": can_afford,
            "recommendation": (
                f"Sim, podes comprar. Ficarias com {balance_after / 100:,.0f} Kz, suficiente para as despesas do mês."
                if can_afford
                else f"Cuidado. Ficarias com {balance_after / 100:,.0f} Kz, abaixo das tuas despesas mensais de {monthly_expense / 100:,.0f} Kz."
            ),
        }
