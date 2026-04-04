"""Report Agent — generate natural language reports and financial score."""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry
from app.models.account import Account
from app.models.category import Category
from app.models.enums import TransactionType
from app.models.transaction import Transaction

REPORT_PROMPT = """És o agente de relatórios d'O Financeiro.

REGRAS:
1. Gera relatórios claros e úteis em linguagem natural.
2. Usa SEMPRE dados reais — chama as tools antes de escrever.
3. Inclui números específicos, percentagens, e comparações.
4. Destaca pontos positivos E áreas de melhoria.
5. Tom: informativo e encorajador.
6. Valores em Kz. Responde em Português (Angola). Não uses emojis. Usa sempre acentuação correcta (Março, família, orçamento).

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""

REPORT_TOOLS = [
    ToolMeta(name="generate_report", description="Gerar relatório mensal com resumo financeiro em linguagem natural",
             parameters={"type": "object", "properties": {"month": {"type": "integer", "description": "Mês (1-12, default: actual)"}, "year": {"type": "integer", "description": "Ano (default: actual)"}}},
             agent="report", category="query", read_only=True),
    ToolMeta(name="get_financial_score", description="Calcular score financeiro do utilizador (0-100)",
             parameters={"type": "object", "properties": {}},
             agent="report", category="compute", read_only=True),
]
ToolRegistry.instance().register_many(REPORT_TOOLS)


class ReportAgent(BaseAgent):
    name = "report"
    description = "Relatórios financeiros"
    system_prompt_template = REPORT_PROMPT
    task_type = TaskType.REPORT_GENERATION

    def get_tools(self) -> list[ToolDefinition]:
        return ToolRegistry.instance().get_tools_for_agent("report")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "generate_report":
            return await self._generate_report(arguments, context)
        if tool_name == "get_financial_score":
            return await self._get_score(context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _generate_report(self, args: dict, ctx: AgentContext) -> dict:
        today = date.today()
        month = args.get("month", today.month)
        year = args.get("year", today.year)
        start = date(year, month, 1)
        if month == 12:
            end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end = date(year, month + 1, 1) - timedelta(days=1)

        # Income
        result = await ctx.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.INCOME,
                Transaction.transaction_date.between(start, end),
            )
        )
        income = result.scalar() or 0

        # Expenses
        result = await ctx.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date.between(start, end),
            )
        )
        expenses = result.scalar() or 0

        # Top categories
        stmt = (
            select(Category.name, func.sum(Transaction.amount).label("total"))
            .join(Category, Transaction.category_id == Category.id, isouter=True)
            .where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date.between(start, end),
            )
            .group_by(Category.name)
            .order_by(func.sum(Transaction.amount).desc())
            .limit(5)
        )
        result = await ctx.db.execute(stmt)
        top_categories = [{"name": r.name or "Outros", "total_kz": r.total / 100} for r in result.all()]

        return {
            "period": f"{start.strftime('%B %Y')}",
            "income_kz": income / 100,
            "expenses_kz": expenses / 100,
            "balance_kz": (income - expenses) / 100,
            "savings_rate": round((income - expenses) / income * 100, 1) if income > 0 else 0,
            "top_categories": top_categories,
            "transaction_count": 0,  # Could count
        }

    async def _get_score(self, ctx: AgentContext) -> dict:
        """Calculate financial score (0-100) based on multiple factors."""
        score = 50  # Base score
        factors = []

        # Factor 1: Has savings (balance > 0)
        result = await ctx.db.execute(
            select(func.sum(Account.balance)).where(
                Account.user_id == ctx.user_id, Account.is_archived.is_(False)
            )
        )
        balance = result.scalar() or 0
        if balance > 0:
            score += 10
            factors.append("Saldo positivo (+10)")
        else:
            score -= 10
            factors.append("Saldo negativo (-10)")

        # Factor 2: Savings rate > 10%
        month_ago = date.today() - timedelta(days=30)
        result = await ctx.db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.INCOME,
                Transaction.transaction_date >= month_ago,
            )
        )
        income = result.scalar() or 0

        result = await ctx.db.execute(
            select(func.sum(Transaction.amount)).where(
                Transaction.user_id == ctx.user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.transaction_date >= month_ago,
            )
        )
        expenses = result.scalar() or 0

        if income > 0:
            savings_rate = (income - expenses) / income
            if savings_rate > 0.2:
                score += 15
                factors.append("Taxa poupança >20% (+15)")
            elif savings_rate > 0.1:
                score += 10
                factors.append("Taxa poupança >10% (+10)")
            elif savings_rate < 0:
                score -= 10
                factors.append("A gastar mais do que ganha (-10)")

        # Factor 3: Has active goals
        from app.models.goal import Goal

        result = await ctx.db.execute(
            select(func.count()).where(Goal.user_id == ctx.user_id, Goal.status == "active")
        )
        goal_count = result.scalar() or 0
        if goal_count > 0:
            score += 10
            factors.append(f"{goal_count} meta(s) activa(s) (+10)")

        # Factor 4: Has budget
        from app.models.budget import Budget

        result = await ctx.db.execute(
            select(func.count()).where(Budget.user_id == ctx.user_id, Budget.is_active.is_(True))
        )
        budget_count = result.scalar() or 0
        if budget_count > 0:
            score += 10
            factors.append("Orçamento activo (+10)")

        score = max(0, min(100, score))

        level = "Excelente" if score >= 80 else "Bom" if score >= 60 else "Regular" if score >= 40 else "Precisa melhorar"

        return {
            "score": score,
            "level": level,
            "factors": factors,
        }
