"""Goals Agent — create goals, check progress, simulate scenarios."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry

GOALS_PROMPT = """És o agente de metas de poupança d'O Financeiro.

REGRAS:
1. Ajuda o utilizador a criar e acompanhar metas de poupança.
2. Usa dados reais — chama get_goal_progress para ver o estado.
3. Motiva o utilizador a poupar.
4. Quando pede simulação, calcula quanto tempo falta com diferentes valores.
5. Celebra marcos (25%, 50%, 75%, 100%).
6. Valores em Kz. Responde em Português (Angola). Não uses emojis. Usa sempre acentuação correcta (Março, família, orçamento).

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""

GOALS_TOOLS = [
    ToolMeta(name="create_goal", description="Criar uma nova meta de poupança",
             parameters={"type": "object", "properties": {"name": {"type": "string", "description": "Nome da meta"}, "target_amount": {"type": "number", "description": "Valor alvo em Kz"}, "contribution_amount": {"type": "number", "description": "Contribuição em Kz"}}, "required": ["name", "target_amount"]},
             agent="goals", category="action", read_only=False),
    ToolMeta(name="get_goal_progress", description="Ver progresso de todas as metas activas",
             parameters={"type": "object", "properties": {}},
             agent="goals", category="query", read_only=True),
    ToolMeta(name="simulate_goal", description="Simular quanto tempo demora a atingir uma meta com um valor mensal",
             parameters={"type": "object", "properties": {"target_amount": {"type": "number", "description": "Valor alvo em Kz"}, "monthly_amount": {"type": "number", "description": "Poupança mensal em Kz"}}, "required": ["target_amount", "monthly_amount"]},
             agent="goals", category="compute", read_only=True),
    ToolMeta(name="update_goal", description="Editar uma meta existente (nome, valor alvo, contribuição)",
             parameters={"type": "object", "properties": {"goal_id": {"type": "string", "description": "UUID da meta"}, "name": {"type": "string"}, "target_amount": {"type": "number", "description": "Novo valor alvo em Kz"}, "contribution_amount": {"type": "number", "description": "Nova contribuição em Kz"}}, "required": ["goal_id"]},
             agent="goals", category="action", read_only=False),
    ToolMeta(name="delete_goal", description="Eliminar uma meta de poupança",
             parameters={"type": "object", "properties": {"goal_id": {"type": "string", "description": "UUID da meta a eliminar"}}, "required": ["goal_id"]},
             agent="goals", category="action", read_only=False),
    ToolMeta(name="contribute_to_goal", description="Adicionar contribuição a uma meta (debita da conta e credita na meta)",
             parameters={"type": "object", "properties": {"goal_id": {"type": "string", "description": "UUID da meta"}, "amount": {"type": "number", "description": "Valor da contribuição em Kz"}, "account_id": {"type": "string", "description": "UUID da conta a debitar"}}, "required": ["goal_id", "amount"]},
             agent="goals", category="action", read_only=False),
]
ToolRegistry.instance().register_many(GOALS_TOOLS)


class GoalsAgent(BaseAgent):
    name = "goals"
    description = "Metas de poupança"
    system_prompt_template = GOALS_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return ToolRegistry.instance().get_tools_for_agent("goals")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "create_goal":
            return await self._create_goal(arguments, context)
        if tool_name == "get_goal_progress":
            return await self._get_progress(context)
        if tool_name == "simulate_goal":
            return await self._simulate(arguments)
        if tool_name == "update_goal":
            return await self._update_goal(arguments, context)
        if tool_name == "delete_goal":
            return await self._delete_goal(arguments, context)
        if tool_name == "contribute_to_goal":
            return await self._contribute(arguments, context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _create_goal(self, args: dict, ctx: AgentContext) -> dict:
        from app.schemas.goal import GoalCreate
        from app.services.goal import create_goal

        data = GoalCreate(
            name=args["name"],
            target_amount=int(args["target_amount"] * 100),
            contribution_amount=int(args["monthly_amount"] * 100) if args.get("monthly_amount") else None,
        )
        goal = await create_goal(ctx.db, ctx.user_id, data, family_id=ctx.family_id)
        return {"success": True, "goal_id": str(goal.id), "name": goal.name}

    async def _get_progress(self, ctx: AgentContext) -> dict:
        from app.services.goal import list_goals

        goals = await list_goals(ctx.db, ctx.user_id, "active", family_id=ctx.family_id)
        if not goals:
            return {"message": "Nenhuma meta activa."}

        return {
            "goals": [
                {
                    "name": g.name,
                    "current_kz": g.current_amount / 100,
                    "target_kz": g.target_amount / 100,
                    "percentage": round(g.current_amount / g.target_amount * 100, 1) if g.target_amount > 0 else 0,
                    "milestone": (
                        "🎉 100%!" if g.current_amount >= g.target_amount
                        else "🥉 75%!" if g.current_amount >= g.target_amount * 0.75
                        else "🥈 50%!" if g.current_amount >= g.target_amount * 0.5
                        else "🥇 25%!" if g.current_amount >= g.target_amount * 0.25
                        else None
                    ),
                }
                for g in goals
            ]
        }

    async def _simulate(self, args: dict) -> dict:
        target = args["target_amount"]
        monthly = args["monthly_amount"]

        if monthly <= 0:
            return {"error": "A contribuição mensal deve ser positiva."}

        months = -(-int(target) // int(monthly))
        years = months // 12
        remaining_months = months % 12

        time_str = ""
        if years > 0:
            time_str += f"{years} ano{'s' if years > 1 else ''}"
        if remaining_months > 0:
            if time_str:
                time_str += " e "
            time_str += f"{remaining_months} mes{'es' if remaining_months > 1 else ''}"

        return {
            "target_kz": target,
            "monthly_kz": monthly,
            "months_needed": months,
            "time_description": time_str,
            "total_saved": monthly * months,
        }

    async def _update_goal(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid
        from app.schemas.goal import GoalUpdate
        from app.services.goal import get_goal, update_goal

        try:
            goal_id = _uuid.UUID(args["goal_id"])
        except (ValueError, KeyError):
            return {"error": "goal_id inválido"}

        goal = await get_goal(ctx.db, goal_id, ctx.user_id, family_id=ctx.family_id)
        if not goal:
            return {"error": "Meta não encontrada"}

        update_data: dict = {}
        if "name" in args:
            update_data["name"] = args["name"]
        if "target_amount" in args:
            update_data["target_amount"] = int(args["target_amount"] * 100)
        if "contribution_amount" in args:
            update_data["contribution_amount"] = int(args["contribution_amount"] * 100)

        data = GoalUpdate(**update_data)
        goal = await update_goal(ctx.db, goal, data)
        await ctx.db.commit()
        return {"success": True, "goal_id": str(goal.id), "name": goal.name}

    async def _delete_goal(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid
        from app.services.goal import get_goal, delete_goal

        try:
            goal_id = _uuid.UUID(args["goal_id"])
        except (ValueError, KeyError):
            return {"error": "goal_id inválido"}

        goal = await get_goal(ctx.db, goal_id, ctx.user_id, family_id=ctx.family_id)
        if not goal:
            return {"error": "Meta não encontrada"}

        name = goal.name
        await delete_goal(ctx.db, goal)
        await ctx.db.commit()
        return {"success": True, "deleted": name}

    async def _contribute(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid
        from app.schemas.goal import GoalContributionCreate
        from app.services.goal import get_goal, contribute

        try:
            goal_id = _uuid.UUID(args["goal_id"])
        except (ValueError, KeyError):
            return {"error": "goal_id inválido"}

        goal = await get_goal(ctx.db, goal_id, ctx.user_id, family_id=ctx.family_id)
        if not goal:
            return {"error": "Meta não encontrada"}

        account_id = None
        if args.get("account_id"):
            try:
                account_id = _uuid.UUID(args["account_id"])
            except ValueError:
                pass

        data = GoalContributionCreate(
            amount=int(args["amount"] * 100),
            from_account_id=account_id,
        )
        contribution = await contribute(ctx.db, ctx.user_id, goal, data)
        await ctx.db.commit()
        return {
            "success": True,
            "goal": goal.name,
            "contributed_kz": args["amount"],
            "new_total_kz": goal.current_amount / 100,
            "percentage": round(goal.current_amount / goal.target_amount * 100, 1) if goal.target_amount > 0 else 0,
        }
