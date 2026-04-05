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
2. As categorias e contas com IDs estão nos DADOS FINANCEIROS. Usa o category_id e account_id correctos ao chamar add_transaction.
3. Infere a categoria com base na descrição e nas categorias disponíveis nos dados. Se ambíguo, pergunta.
4. Quando o utilizador especificar a conta (Carteira, BFA, BAI), usa o account_id dos DADOS FINANCEIROS. Se não especificar, usa a primeira conta.
5. FLUXO DE REGISTO: Mostra os dados ao utilizador e pergunta "Queres que registe?" — NÃO chames a tool antes da confirmação.
6. Quando o utilizador confirmar (sim, ok, correcto), chama add_transaction com TODOS os dados correctos.
7. CORRECÇÃO NA CONFIRMAÇÃO: Se o utilizador corrigir algo na confirmação (ex: "sim, mas é quarta parcela" ou "sim, na carteira"), usa os dados CORRIGIDOS na chamada da tool — NÃO uses os dados originais.
8. Para editar transacções existentes, usa update_transaction. Para eliminar, usa delete_transaction. Para MOVER transacções entre contas (ex: de pessoal para familiar), usa move_transaction. Operações de escrita (add, update, delete, move) PEDEM SEMPRE confirmação antes de executar.
9. Valores são sempre em Kwanzas (Kz). Converte se necessário.
10. Responde sempre em Português (Angola) COM acentuação correcta. Não uses emojis.
11. NUNCA inventes valores — usa apenas o que o utilizador diz.
12. DESCRIÇÃO RICA: Se a factura/recibo identificar um beneficiário (ex: nome do aluno numa propina, nome do paciente numa consulta), inclui-o na descrição. Ex: "Propina Setembro 2024 — Ana Cussei — Colégio X". Só inclui quando o documento tem essa informação e faz sentido.

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
        description="Registar uma nova transacção (gasto ou receita). Usa o account_id para seleccionar a conta correcta.",
        parameters={
            "type": "object",
            "properties": {
                "amount": {"type": "number", "description": "Valor em Kz (sem centavos)"},
                "type": {"type": "string", "enum": ["expense", "income"], "description": "Tipo"},
                "description": {"type": "string", "description": "Descrição da transacção"},
                "category_id": {"type": "string", "description": "UUID da categoria (obtido de get_categories)"},
                "account_id": {"type": "string", "description": "UUID da conta onde registar (obtido de get_balance). Se não fornecido, usa a primeira conta."},
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
    ToolMeta(
        name="update_transaction",
        description="Editar uma transacção existente (descrição, valor, categoria, conta)",
        parameters={
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "UUID da transacção a editar (obtido de get_transactions ou search_transactions)"},
                "description": {"type": "string", "description": "Nova descrição"},
                "amount": {"type": "number", "description": "Novo valor em Kz"},
                "category_id": {"type": "string", "description": "Novo category_id"},
            },
            "required": ["transaction_id"],
        },
        agent="tracker", category="action", read_only=False,
    ),
    ToolMeta(
        name="delete_transaction",
        description="Eliminar uma transacção existente",
        parameters={
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "UUID da transacção a eliminar"},
            },
            "required": ["transaction_id"],
        },
        agent="tracker", category="action", read_only=False,
    ),
    ToolMeta(
        name="move_transaction",
        description="Mover uma transacção de uma conta para outra (ex: de pessoal para familiar ou vice-versa). Reverte o saldo na conta original e aplica na conta destino.",
        parameters={
            "type": "object",
            "properties": {
                "transaction_id": {"type": "string", "description": "UUID da transacção a mover"},
                "target_account_id": {"type": "string", "description": "UUID da conta de destino (obtido de get_balance)"},
            },
            "required": ["transaction_id", "target_account_id"],
        },
        agent="tracker", category="action", read_only=False,
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
        if tool_name == "update_transaction":
            return await self._update_transaction(arguments, context)
        if tool_name == "delete_transaction":
            return await self._delete_transaction(arguments, context)
        if tool_name == "move_transaction":
            return await self._move_transaction(arguments, context)
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

        # Select account: use account_id if provided, otherwise first account
        account = None
        account_id_str = args.get("account_id")
        if account_id_str:
            try:
                acc_uuid = _uuid.UUID(account_id_str)
                result = await ctx.db.execute(
                    select(Account).where(Account.id == acc_uuid, Account.user_id == ctx.user_id)
                )
                account = result.scalar_one_or_none()
            except ValueError:
                pass

        if not account:
            # Fallback to first account
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

        try:
            txn = await create_transaction(ctx.db, ctx.user_id, data, family_id=ctx.family_id)
        except Exception as e:
            return {"error": f"Erro ao registar: {e!s}"}
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
            select(Account.id, Account.name, Account.type, Account.balance, Account.currency)
            .where(Account.user_id == ctx.user_id, Account.is_archived.is_(False))
        )
        accounts = result.all()

        total = sum(a.balance for a in accounts)
        account_list = [
            {"id": str(a.id), "name": a.name, "type": a.type, "balance_kz": a.balance / 100, "currency": a.currency}
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
                    "id": str(t.id),
                    "date": str(t.transaction_date),
                    "amount_kz": t.amount / 100,
                    "type": t.type,
                    "description": t.description,
                }
                for t in txns
            ],
        }

    async def _update_transaction(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid
        from app.models.transaction import Transaction
        from app.schemas.transaction import TransactionUpdate
        from app.services.transaction import update_transaction

        try:
            txn_uuid = _uuid.UUID(args["transaction_id"])
        except (ValueError, KeyError):
            return {"error": "transaction_id inválido"}

        result = await ctx.db.execute(
            select(Transaction).where(Transaction.id == txn_uuid, Transaction.user_id == ctx.user_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            return {"error": "Transacção não encontrada"}

        # Build update data — only include fields that were provided
        update_data: dict = {}
        if "description" in args:
            update_data["description"] = args["description"]
        if "amount" in args:
            update_data["amount"] = int(args["amount"] * 100)
        if "category_id" in args:
            try:
                update_data["category_id"] = _uuid.UUID(args["category_id"])
            except ValueError:
                pass

        data = TransactionUpdate(**update_data)
        txn = await update_transaction(ctx.db, txn, data)
        await ctx.db.commit()
        return {
            "success": True,
            "transaction_id": str(txn.id),
            "description": txn.description,
            "amount_kz": txn.amount / 100,
        }

    async def _delete_transaction(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid
        from app.models.transaction import Transaction
        from app.services.transaction import delete_transaction

        try:
            txn_uuid = _uuid.UUID(args["transaction_id"])
        except (ValueError, KeyError):
            return {"error": "transaction_id inválido"}

        result = await ctx.db.execute(
            select(Transaction).where(Transaction.id == txn_uuid, Transaction.user_id == ctx.user_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            return {"error": "Transacção não encontrada"}

        description = txn.description
        await delete_transaction(ctx.db, txn)
        await ctx.db.commit()
        return {"success": True, "deleted": str(txn_uuid), "description": description}

    async def _move_transaction(self, args: dict, ctx: AgentContext) -> dict:
        import uuid as _uuid
        from app.models.transaction import Transaction
        from app.services.transaction import move_transaction

        try:
            txn_uuid = _uuid.UUID(args["transaction_id"])
            target_account_id = _uuid.UUID(args["target_account_id"])
        except (ValueError, KeyError):
            return {"error": "transaction_id ou target_account_id inválido"}

        # Find transaction (search across all user's transactions, not context-filtered)
        result = await ctx.db.execute(
            select(Transaction).where(Transaction.id == txn_uuid, Transaction.user_id == ctx.user_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            return {"error": "Transacção não encontrada"}

        old_account = await ctx.db.get(Account, txn.account_id)
        old_account_name = old_account.name if old_account else "?"

        try:
            txn = await move_transaction(ctx.db, txn, target_account_id, ctx.user_id)
        except ValueError as e:
            return {"error": str(e)}

        new_account = await ctx.db.get(Account, target_account_id)
        new_account_name = new_account.name if new_account else "?"

        await ctx.db.commit()
        return {
            "success": True,
            "transaction_id": str(txn.id),
            "description": txn.description,
            "amount_kz": txn.amount / 100,
            "moved_from": old_account_name,
            "moved_to": new_account_name,
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
                    "id": str(t.id),
                    "date": str(t.transaction_date),
                    "amount_kz": t.amount / 100,
                    "type": t.type,
                    "description": t.description,
                }
                for t in txns
            ],
        }
