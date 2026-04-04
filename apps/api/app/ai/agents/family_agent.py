"""Family Agent — family spending, child expenses, member contributions."""

from datetime import date, timedelta

from sqlalchemy import func, select

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.models.enums import TransactionType
from app.models.family import FamilyMember
from app.models.transaction import Transaction
from app.models.user import User
from app.services.family import get_family_spending, get_user_family

FAMILY_PROMPT = """És o agente de finanças familiares d'O Financeiro.

REGRAS:
1. Ajuda a gerir finanças do agregado familiar.
2. Usa dados reais — chama as tools antes de responder.
3. Respeita a privacidade — não mostres transacções privadas.
4. Valores em Kz. Responde em Português (Angola).

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""

FAMILY_TOOLS = [
    ToolDefinition(
        name="get_family_summary",
        description="Resumo financeiro da família (membros, gastos totais por membro)",
        parameters={
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Período em dias (default: 30)"},
            },
        },
    ),
    ToolDefinition(
        name="get_child_spending",
        description="Gastos de um dependente/filho específico",
        parameters={
            "type": "object",
            "properties": {
                "child_name": {"type": "string", "description": "Nome do dependente"},
            },
        },
    ),
    ToolDefinition(
        name="get_member_contributions",
        description="Contribuições de cada membro para as despesas partilhadas",
        parameters={"type": "object", "properties": {}},
    ),
]


class FamilyAgent(BaseAgent):
    name = "family"
    description = "Finanças familiares"
    system_prompt_template = FAMILY_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return FAMILY_TOOLS

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "get_family_summary":
            return await self._get_summary(arguments, context)
        if tool_name == "get_child_spending":
            return await self._get_child_spending(arguments, context)
        if tool_name == "get_member_contributions":
            return await self._get_contributions(context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _get_summary(self, args: dict, ctx: AgentContext) -> dict:
        family = await get_user_family(ctx.db, ctx.user_id)
        if not family:
            return {"error": "Não pertence a nenhuma família."}

        days = args.get("days", 30)
        spending = await get_family_spending(ctx.db, family.id, days)

        total = sum(s["total_spent"] for s in spending)
        return {
            "family_name": family.name,
            "period_days": days,
            "total_family_spending_kz": total / 100,
            "members": [
                {"name": s["name"], "spent_kz": s["total_spent"] / 100}
                for s in spending
            ],
        }

    async def _get_child_spending(self, args: dict, ctx: AgentContext) -> dict:
        family = await get_user_family(ctx.db, ctx.user_id)
        if not family:
            return {"error": "Não pertence a nenhuma família."}

        # Find dependent members
        result = await ctx.db.execute(
            select(FamilyMember, User.name)
            .join(User, FamilyMember.user_id == User.id)
            .where(
                FamilyMember.family_id == family.id,
                FamilyMember.role == "dependent",
                FamilyMember.is_active.is_(True),
            )
        )
        dependents = result.all()

        if not dependents:
            return {"message": "Nenhum dependente registado na família."}

        # Get spending for each dependent
        date_from = date.today() - timedelta(days=30)
        children_data = []
        for member, name in dependents:
            result = await ctx.db.execute(
                select(func.coalesce(func.sum(Transaction.amount), 0))
                .where(
                    Transaction.user_id == member.user_id,
                    Transaction.type == TransactionType.EXPENSE,
                    Transaction.transaction_date >= date_from,
                )
            )
            total = result.scalar() or 0
            children_data.append({"name": name, "spent_kz": total / 100})

        return {"dependents": children_data}

    async def _get_contributions(self, ctx: AgentContext) -> dict:
        family = await get_user_family(ctx.db, ctx.user_id)
        if not family:
            return {"error": "Não pertence a nenhuma família."}

        spending = await get_family_spending(ctx.db, family.id, 30)
        total = sum(s["total_spent"] for s in spending)

        return {
            "family_name": family.name,
            "contribution_model": family.contribution_model,
            "total_spending_kz": total / 100,
            "members": [
                {
                    "name": s["name"],
                    "contributed_kz": s["total_spent"] / 100,
                    "percentage": round(s["total_spent"] / total * 100, 1) if total > 0 else 0,
                }
                for s in spending
            ],
        }
