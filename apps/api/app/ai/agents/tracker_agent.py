"""Tracker Agent — registers and queries financial transactions."""


from sqlalchemy import select

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.models.account import Account
from app.schemas.transaction import TransactionCreate
from app.services.transaction import create_transaction, list_transactions

TRACKER_PROMPT = """És o agente de tracking financeiro d'O Financeiro.

REGRAS:
1. Quando o utilizador diz que gastou/recebeu dinheiro, usa a tool add_transaction.
2. Infere a categoria com base na descrição. Se ambíguo, pergunta.
3. Se o utilizador não especificar a conta, usa a primeira conta disponível.
4. Confirma sempre a transacção antes de registar: "Registei: X Kz em [Categoria]. Correcto?"
5. Usa os factos conhecidos sobre o utilizador para contextualizar.
6. Valores são sempre em Kwanzas (Kz). Converte se necessário.
7. Responde sempre em Português (Angola).
8. NUNCA inventes valores — usa apenas o que o utilizador diz.

FACTOS DO UTILIZADOR:
{user_facts}

SKILLS:
{loaded_skills}"""


TRACKER_TOOLS = [
    ToolDefinition(
        name="add_transaction",
        description="Registar uma nova transacção (gasto ou receita)",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Valor em Kz (sem centavos)"},
                "type": {"type": "string", "enum": ["expense", "income"], "description": "Tipo"},
                "description": {"type": "string", "description": "Descrição da transacção"},
                "category": {"type": "string", "description": "Categoria (ex: Alimentação, Transporte)"},
            },
            "required": ["amount", "type", "description"],
        },
        confirm_before_execute=True,
    ),
    ToolDefinition(
        name="get_balance",
        description="Obter saldo total e saldo por conta",
        parameters={"type": "object", "properties": {}},
    ),
    ToolDefinition(
        name="get_transactions",
        description="Consultar transacções recentes com filtros opcionais",
        parameters={
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Número de transacções (default: 10)"},
                "type": {"type": "string", "enum": ["expense", "income", "transfer"]},
            },
        },
    ),
    ToolDefinition(
        name="search_transactions",
        description="Pesquisar transacções por texto (descrição, comerciante)",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Texto de pesquisa"},
            },
            "required": ["query"],
        },
    ),
]


class TrackerAgent(BaseAgent):
    name = "tracker"
    description = "Regista e consulta transacções financeiras"
    system_prompt_template = TRACKER_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return TRACKER_TOOLS

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "add_transaction":
            return await self._add_transaction(arguments, context)
        if tool_name == "get_balance":
            return await self._get_balance(context)
        if tool_name == "get_transactions":
            return await self._get_transactions(arguments, context)
        if tool_name == "search_transactions":
            return await self._search_transactions(arguments, context)
        return {"error": f"Tool '{tool_name}' desconhecida"}

    async def _add_transaction(self, args: dict, ctx: AgentContext) -> dict:
        # Get default account
        result = await ctx.db.execute(
            select(Account).where(Account.user_id == ctx.user_id, Account.is_archived.is_(False))
            .order_by(Account.sort_order)
            .limit(1)
        )
        account = result.scalar_one_or_none()
        if not account:
            return {"error": "Nenhuma conta encontrada. Crie uma conta primeiro."}

        amount_kz = args.get("amount", 0)
        amount_centavos = int(amount_kz * 100)

        data = TransactionCreate(
            account_id=account.id,
            amount=amount_centavos,
            type=args.get("type", "expense"),
            description=args.get("description"),
        )

        txn = await create_transaction(ctx.db, ctx.user_id, data)
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
