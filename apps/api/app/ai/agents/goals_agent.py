"""Goals Agent — create goals, check progress, simulate scenarios."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType

GOALS_PROMPT = """És o agente de metas de poupança d'O Financeiro.

REGRAS:
1. Ajuda o utilizador a criar e acompanhar metas de poupança.
2. Usa dados reais — chama get_goal_progress para ver o estado.
3. Motiva o utilizador a poupar.
4. Quando pede simulação, calcula quanto tempo falta com diferentes valores.
5. Celebra marcos (25%, 50%, 75%, 100%).
6. Valores em Kz. Responde em Português (Angola).

FACTOS DO UTILIZADOR:
{user_facts}

{loaded_skills}"""

GOALS_TOOLS = [
    ToolDefinition(
        name="create_goal",
        description="Criar uma nova meta de poupança",
        parameters={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Nome da meta"},
                "target_amount": {"type": "number", "description": "Valor alvo em Kz"},
                "monthly_contribution": {"type": "number", "description": "Contribuição mensal em Kz"},
            },
            "required": ["name", "target_amount"],
        },
        confirm_before_execute=True,
    ),
    ToolDefinition(
        name="get_goal_progress",
        description="Ver progresso de todas as metas activas",
        parameters={"type": "object", "properties": {}},
    ),
    ToolDefinition(
        name="simulate_goal",
        description="Simular quanto tempo demora a atingir uma meta com um valor mensal",
        parameters={
            "type": "object",
            "properties": {
                "target_amount": {"type": "number", "description": "Valor alvo em Kz"},
                "monthly_amount": {"type": "number", "description": "Poupança mensal em Kz"},
            },
            "required": ["target_amount", "monthly_amount"],
        },
    ),
]


class GoalsAgent(BaseAgent):
    name = "goals"
    description = "Metas de poupança"
    system_prompt_template = GOALS_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return GOALS_TOOLS

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "create_goal":
            return await self._create_goal(arguments, context)
        if tool_name == "get_goal_progress":
            return await self._get_progress(context)
        if tool_name == "simulate_goal":
            return await self._simulate(arguments)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _create_goal(self, args: dict, ctx: AgentContext) -> dict:
        from app.schemas.goal import GoalCreate
        from app.services.goal import create_goal

        data = GoalCreate(
            name=args["name"],
            target_amount=int(args["target_amount"] * 100),
            monthly_contribution=int(args["monthly_amount"] * 100) if args.get("monthly_amount") else None,
        )
        goal = await create_goal(ctx.db, ctx.user_id, data)
        return {"success": True, "goal_id": str(goal.id), "name": goal.name}

    async def _get_progress(self, ctx: AgentContext) -> dict:
        from app.services.goal import list_goals

        goals = await list_goals(ctx.db, ctx.user_id, "active")
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
