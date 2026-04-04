"""Tracker Agent — registers and queries financial transactions."""


from sqlalchemy import select

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry
from app.models.account import Account
from app.schemas.transaction import TransactionCreate
from app.services.transaction import create_transaction, list_transactions

TRACKER_PROMPT = """És o agente de tracking financeiro d'O Financeiro.

REGRAS:
1. Quando o utilizador diz que gastou/recebeu dinheiro, PRIMEIRO pergunta confirmação, SÓ DEPOIS chama add_transaction.
2. ANTES de registar, chama get_categories para obter a lista de categorias com IDs reais. Usa o category_id correcto no add_transaction.
3. Infere a categoria com base na descrição e nas categorias disponíveis. Se ambíguo, pergunta.
4. Se o utilizador não especificar a conta, usa a primeira conta disponível.
5. FLUXO DE REGISTO: Mostra os dados ao utilizador e pergunta "Queres que registe: X Kz em [Categoria]?" — NÃO uses a tool antes da confirmação.
6. Quando o utilizador confirmar (sim, ok, correcto), AÍ SIM chama add_transaction com o category_id.
6. Usa os factos conhecidos sobre o utilizador para contextualizar.
7. Valores são sempre em Kwanzas (Kz). Converte se necessário.
8. Responde sempre em Português (Angola) COM acentuação correcta. Não uses emojis.
9. NUNCA inventes valores — usa apenas o que o utilizador diz.

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

SKILLS:
{loaded_skills}"""


TRACKER_TOOLS = [
    ToolMeta(
        name="get_categories",
        description="Obter lista de categorias disponíveis para transacções — chamar ANTES de add_transaction para saber o category_id correcto",
        parameters={"type": "object", "properties": {}},
        agent="tracker", category="query", read_only=True,
    ),
    ToolMeta(
        name="add_transaction",
        description="Registar uma nova transacção (gasto ou receita). Usa o category_id obtido de get_categories.",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Valor em Kz (sem centavos)"},
                "type": {"type": "string", "enum": ["expense", "income"], "description": "Tipo"},
                "description": {"type": "string", "description": "Descrição da transacção"},
                "category_id": {"type": "string", "description": "UUID da categoria (obtido de get_categories)"},
            },
            "required": ["amount", "type", "description"],
        },
        agent="tracker", category="action", read_only=False,
    ),
    ToolMeta(
        name="get_balance",
        description="Obter saldo total e saldo por conta",
        parameters={"type": "object", "properties": {}},
        agent="tracker", category="query", read_only=True,
    ),
    ToolMeta(
        name="get_transactions",
        description="Consultar transacções recentes com filtros opcionais",
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Número de transacções (default: 10)"},
                "type": {"type": "string", "enum": ["expense", "income", "transfer"]},
            },
        },
        agent="tracker", category="query", read_only=True,
    ),
    ToolMeta(
        name="search_transactions",
        description="Pesquisar transacções por texto (descrição, comerciante)",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Texto de pesquisa"},
            },
            "required": ["query"],
        },
        agent="tracker", category="query", read_only=True,
    ),
]
ToolRegistry.instance().register_many(TRACKER_TOOLS)


class TrackerAgent(BaseAgent):
    name = "tracker"
    description = "Regista e consulta transacções financeiras"
    system_prompt_template = TRACKER_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return ToolRegistry.instance().get_tools_for_agent("tracker")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "get_categories":
            return await self._get_categories(context)
        if tool_name == "add_transaction":
            return await self._add_transaction(arguments, context)
        if tool_name == "get_balance":
            return await self._get_balance(context)
        if tool_name == "get_transactions":
            return await self._get_transactions(arguments, context)
        if tool_name == "search_transactions":
            return await self._search_transactions(arguments, context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _get_categories(self, ctx: AgentContext) -> dict:
        from sqlalchemy import or_
        from app.models.category import Category

        # Include system categories AND user's custom categories
        result = await ctx.db.execute(
            select(Category.id, Category.name, Category.type, Category.icon)
            .where(
                or_(
                    Category.is_system.is_(True),
                    Category.user_id == ctx.user_id,
                ),
                Category.is_active.is_(True),
            )
            .order_by(Category.name)
        )
        cats = result.all()
        if not cats:
            return {"categories": [], "message": "Nenhuma categoria criada."}

        return {
            "categories": [
                {"id": str(c.id), "name": c.name, "type": c.type, "icon": c.icon}
                for c in cats
            ],
        }

    async def _add_transaction(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid

        # Get default account
        result = await ctx.db.execute(
            select(Account).where(Account.user_id == ctx.user_id, Account.is_archived.is_(False))
            .order_by(Account.sort_order)
            .limit(1)
        )
        account = result.scalar_one_or_none()
        if not account:
            return {"error": "Nenhuma conta encontrada. Crie uma conta primeiro."}

        # Category ID: use directly if provided (from get_categories)
        category_id = None
        cat_id_str = args.get("category_id")
        if cat_id_str:
            try:
                category_id = _uuid.UUID(cat_id_str)
            except ValueError:
                pass

        amount_kz = args.get("amount", 0)
        amount_centavos = int(amount_kz * 100)

        data = TransactionCreate(
            account_id=account.id,
            category_id=category_id,
            amount=amount_centavos,
            type=args.get("type", "expense"),
            description=args.get("description"),
        )

        txn = await create_transaction(ctx.db, ctx.user_id, data)
        await ctx.db.commit()
        return {
            "success": True,
            "transaction_id": str(txn.id),
            "amount": amount_kz,
            "type": args.get("type"),
            "description": args.get("description"),
            "account": account.name,
        }

    async def _get_balance(self, ctx: AgentContext) -> dict:
        result = await ctx.db.execute(
            select(Account.name, Account.type, Account.balance, Account.currency)
            .where(Account.user_id == ctx.user_id, Account.is_archived.is_(False))
        )
        accounts = result.all()

        total = sum(a.balance for a in accounts)
        account_list = [
            {"name": a.name, "type": a.type, "balance_kz": a.balance / 100, "currency": a.currency}
            for a in accounts
        ]

        return {
            "total_balance_kz": total / 100,
            "accounts": account_list,
        }

    async def _get_transactions(self, args: dict, ctx: AgentContext) -> dict:
        from app.schemas.transaction import TransactionFilter

        filters = TransactionFilter()
        if "type" in args:
            filters.type = args["type"]

        limit = args.get("limit", 10)
        txns, _ = await list_transactions(ctx.db, ctx.user_id, filters, limit=limit)

        return {
            "count": len(txns),
            "transactions": [
                {
                    "date": str(t.transaction_date),
                    "amount_kz": t.amount / 100,
                    "type": t.type,
                    "description": t.description,
                }
                for t in txns
            ],
        }

    async def _search_transactions(self, args: dict, ctx: AgentContext) -> dict:
        from app.schemas.transaction import TransactionFilter

        query = args.get("query", "")
        filters = TransactionFilter(search=query)
        txns, _ = await list_transactions(ctx.db, ctx.user_id, filters, limit=10)

        return {
            "query": query,
            "count": len(txns),
            "transactions": [
                {
                    "date": str(t.transaction_date),
                    "amount_kz": t.amount / 100,
                    "type": t.type,
                    "description": t.description,
                }
                for t in txns
            ],
        }
