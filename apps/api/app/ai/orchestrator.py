"""Chat orchestrator — routes messages through agents with full context awareness.

Inspired by Claude Code's query loop architecture:
- Real user data injection (accounts, balances, transactions, budgets, goals)
- Context switching (personal/family) awareness
- State management across iterations
- Error recovery with retry and fallback
- Session memory with conversation history
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.advisor_agent import AdvisorAgent
from app.ai.agents.base import AgentContext, AgentResponse, BaseAgent
from app.ai.agents.budget_agent import BudgetAgent
from app.ai.agents.debt_agent import DebtAgent
from app.ai.agents.family_agent import FamilyAgent
from app.ai.agents.goals_agent import GoalsAgent
from app.ai.agents.investment_agent import InvestmentAgent
from app.ai.agents.news_agent import NewsAgent
from app.ai.agents.report_agent import ReportAgent
from app.ai.agents.router_agent import RouterAgent
from app.ai.agents.tracker_agent import TrackerAgent
from app.ai.llm.base import LLMMessage
from app.ai.llm.router import LLMRouter
from app.ai.cost_tracker import track_agent_cost
from app.ai.memory.extractor import extract_facts_from_message
from app.ai.memory.facts import get_user_facts
from app.ai.memory.semantic import search_similar, store_embedding
from app.ai.memory.session import add_message_to_session, get_session
from app.ai.metering import record_token_usage
from app.ai.skills import SkillLoader, SkillResolver

logger = logging.getLogger(__name__)


async def _load_user_financial_context(
    db: AsyncSession,
    user_id: uuid.UUID,
    finance_context: str,
) -> str:
    """Load real financial data to inject into the agent's system prompt.

    This is the key difference from a generic chatbot — the agent KNOWS
    the user's actual financial situation.
    """
    from app.models.account import Account
    from app.models.transaction import Transaction
    from app.models.budget import Budget, BudgetItem
    from app.models.goal import Goal
    from app.models.debt import Debt
    from app.models.subscription import UserSubscription
    from app.models.user import User
    from app.models.enums import TransactionType, SubscriptionStatus

    sections: list[str] = []

    # --- Current date (LLM does not know the real date) ---
    from datetime import date as _date
    today = _date.today()
    sections.append(f"DATA ACTUAL: {today.strftime('%d/%m/%Y')} ({today.strftime('%A, %d de %B de %Y')})")

    # --- User profile ---
    user = await db.get(User, user_id)
    if user:
        sections.append(
            f"UTILIZADOR: {user.name or 'Sem nome'}\n"
            f"Telefone: {user.phone or '—'}\n"
            f"Moeda: {user.currency_default or 'AOA'}\n"
            f"Dia do salario: {user.salary_day or '—'}\n"
            f"Plano: {user.plan or 'free'}"
        )

    # --- Context (personal or family) ---
    is_family = finance_context.startswith("family:")
    family_id_str = finance_context.replace("family:", "") if is_family else None
    context_label = "FAMILIAR" if is_family else "PESSOAL"
    sections.append(f"CONTEXTO ACTIVO: {context_label}")

    if is_family and family_id_str:
        from app.models.family import Family, FamilyMember
        try:
            fam_uuid = uuid.UUID(family_id_str)
            family = await db.get(Family, fam_uuid)
            if family:
                sections.append(f"FAMILIA: {family.name}")
                members_result = await db.scalars(
                    select(FamilyMember).where(
                        FamilyMember.family_id == fam_uuid,
                        FamilyMember.is_active.is_(True),
                    )
                )
                members = list(members_result.all())
                if members:
                    member_names = []
                    for m in members:
                        member_user = await db.get(User, m.user_id)
                        name = member_user.name if member_user else m.display_name
                        member_names.append(f"{name} ({m.role.value})")
                    sections.append(f"Membros: {', '.join(member_names)}")
        except (ValueError, Exception):
            pass

    # --- Accounts with balances ---
    if is_family and family_id_str:
        try:
            acct_query = select(Account).where(
                Account.family_id == uuid.UUID(family_id_str),
                Account.is_archived.is_(False),
            )
        except (ValueError, Exception):
            acct_query = select(Account).where(
                Account.user_id == user_id,
                Account.is_archived.is_(False),
            )
    else:
        # Personal context: only personal accounts (no family_id)
        acct_query = select(Account).where(
            Account.user_id == user_id,
            Account.family_id.is_(None),
            Account.is_archived.is_(False),
        )

    accts = await db.scalars(acct_query.order_by(Account.balance.desc()).limit(10))
    accounts = list(accts.all())
    if accounts:
        total_balance = sum(a.balance for a in accounts)
        acct_lines = [f"CONTAS ({len(accounts)}) — Saldo total: {total_balance / 100:,.0f} Kz"]
        for a in accounts:
            acct_lines.append(f"  - {a.name} ({a.type.value}): {a.balance / 100:,.0f} Kz [account_id: {a.id}]")
        sections.append("\n".join(acct_lines))

    # --- Categories available (for correct assignment) ---
    from app.models.category import Category
    cat_query = select(Category).where(
        Category.is_active.is_(True),
        Category.is_system.is_(True),
    ).order_by(Category.name).limit(50)
    cats = await db.scalars(cat_query)
    categories = list(cats.all())
    if categories:
        cat_lines = [f"CATEGORIAS DISPONÍVEIS ({len(categories)}) — usar o category_id ao registar transacções:"]
        for c in categories:
            cat_lines.append(f"  - {c.name} ({c.type.value}) [category_id: {c.id}]")
        sections.append("\n".join(cat_lines))

    # --- Recent transactions (last 7 days) ---
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    txn_query = (
        select(Transaction)
        .where(
            Transaction.user_id == user_id,
            Transaction.created_at >= seven_days_ago,
        )
        .order_by(Transaction.created_at.desc())
        .limit(10)
    )
    txns = await db.scalars(txn_query)
    transactions = list(txns.all())
    if transactions:
        txn_lines = [f"TRANSACCOES RECENTES ({len(transactions)}, ultimos 7 dias):"]
        for t in transactions:
            sign = "+" if t.type == TransactionType.INCOME else "-"
            txn_lines.append(
                f"  {sign}{t.amount / 100:,.0f} Kz — {t.description or 'Sem descricao'}"
            )
        sections.append("\n".join(txn_lines))

    # --- Active budgets ---
    budgets = await db.scalars(
        select(Budget).where(Budget.user_id == user_id).limit(3)
    )
    budget_list = list(budgets.all())
    if budget_list:
        budget_lines = ["ORCAMENTOS ACTIVOS:"]
        for b in budget_list:
            budget_lines.append(f"  - {b.name}: limite {(b.total_limit or 0) / 100:,.0f} Kz [budget_id: {b.id}]")
        sections.append("\n".join(budget_lines))

    # --- Goals ---
    goals = await db.scalars(
        select(Goal).where(
            Goal.user_id == user_id,
            Goal.status == "active",
        ).limit(5)
    )
    goal_list = list(goals.all())
    if goal_list:
        goal_lines = ["METAS ACTIVAS:"]
        for g in goal_list:
            pct = (g.current_amount / g.target_amount * 100) if g.target_amount > 0 else 0
            goal_lines.append(
                f"  - {g.name}: {g.current_amount / 100:,.0f} / {g.target_amount / 100:,.0f} Kz ({pct:.0f}%) [goal_id: {g.id}]"
            )
        sections.append("\n".join(goal_lines))

    # --- Debts ---
    debts = await db.scalars(
        select(Debt).where(Debt.user_id == user_id).limit(5)
    )
    debt_list = list(debts.all())
    if debt_list:
        total_debt = sum(d.current_balance for d in debt_list)
        debt_lines = [f"DIVIDAS ({len(debt_list)}) — Total: {total_debt / 100:,.0f} Kz"]
        for d in debt_list:
            debt_lines.append(
                f"  - {d.name}: {d.current_balance / 100:,.0f} Kz (pagamento {(d.monthly_payment or 0) / 100:,.0f} Kz/mes) [debt_id: {d.id}]"
            )
        sections.append("\n".join(debt_lines))

    # --- Subscription ---
    sub = await db.scalar(
        select(UserSubscription).where(
            UserSubscription.user_id == user_id,
            UserSubscription.status.in_(["active", "trialing"]),
        ).order_by(UserSubscription.created_at.desc()).limit(1)
    )
    if sub:
        plan_name = sub.plan_snapshot.get("name", "—")
        status = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
        sections.append(f"SUBSCRICAO: {plan_name} ({status})")

    return "\n\n".join(sections)


class ChatOrchestrator:
    """Orchestrates the multi-agent chat system with full context awareness."""

    def __init__(self, router: LLMRouter) -> None:
        self.llm_router = router
        self.router_agent = RouterAgent(router)

        self.agents: dict[str, BaseAgent] = {
            "TRACKER": TrackerAgent(router),
            "ADVISOR": AdvisorAgent(router),
            "BUDGET": BudgetAgent(router),
            "GOALS": GoalsAgent(router),
            "FAMILY": FamilyAgent(router),
            "REPORT": ReportAgent(router),
            "DEBT": DebtAgent(router),
            "INVESTMENT": InvestmentAgent(router),
            "NEWS": NewsAgent(router),
        }

        # Skills — loaded once at startup, resolved per request
        self._skill_loader = SkillLoader()
        self._skill_loader.load_all()
        self._skill_resolver = SkillResolver(self._skill_loader)

    async def process_message(
        self,
        user_id: uuid.UUID,
        session_id: str,
        message: str,
        db: AsyncSession,
        conversation_history: list[dict] | None = None,
        finance_context: str = "personal",
    ) -> AgentResponse:
        """Process a user message through the multi-agent system.

        Args:
            user_id: The authenticated user's ID
            session_id: Conversation session ID
            message: User's message text
            db: Database session
            conversation_history: Optional conversation history
            finance_context: "personal" or "family:{uuid}" from X-Context header
        """

        # 1. Load user facts from memory
        user_facts = await get_user_facts(db, user_id)

        # 2. Load real financial context (accounts, balances, transactions, etc.)
        try:
            financial_context = await _load_user_financial_context(db, user_id, finance_context)
        except Exception:
            logger.exception("Failed to load financial context for user %s", user_id)
            financial_context = "Erro ao carregar dados financeiros."

        # 2b. Search semantic memory for relevant past context
        try:
            similar_memories = await search_similar(db, user_id, message, limit=3, threshold=0.65)
            if similar_memories:
                memory_lines = ["MEMORIA DE CONVERSAS ANTERIORES:"]
                for mem in similar_memories:
                    memory_lines.append(f"  - {mem['content']}")
                financial_context += "\n\n" + "\n".join(memory_lines)
        except Exception:
            logger.debug("Semantic memory search unavailable")

        # 3. Load session history from Redis
        if not conversation_history:
            session_data = await get_session(user_id, session_id)
            conversation_history = session_data.get("messages", [])

        # 4. Route to the correct agent
        # If this is a short confirmation response ("sim", "ok", "nao"),
        # continue with the last agent from the session instead of re-routing
        last_agent = None
        if conversation_history:
            for msg in reversed(conversation_history):
                if msg.get("role") == "assistant" and msg.get("agent"):
                    last_agent = msg.get("agent")
                    break

        short_confirms = {"sim", "nao", "ok", "confirmo", "cancela", "correcto", "esta", "certo", "pode", "faz"}
        is_confirmation = message.strip().lower().rstrip("!.,?") in short_confirms

        if is_confirmation and last_agent and last_agent.upper() in self.agents:
            agent_name = last_agent.upper()
            logger.info("Confirmation '%s' → continuing with agent %s", message, agent_name)
        else:
            agent_name = await self.router_agent.classify_intent(message)
            logger.info("Routed '%s' → agent %s (last_agent=%s, is_confirm=%s)", message[:50], agent_name, last_agent, is_confirmation)

        # 5. Get the agent
        agent = self.agents.get(agent_name)
        if not agent:
            agent = BaseAgent(self.llm_router)
            agent.name = "general"
            agent.system_prompt_template = (
                "És o assistente financeiro d'O Financeiro. "
                "Responde de forma útil em Português (Angola) com acentuação correcta. "
                "Não executes operações — apenas responde a perguntas gerais.\n\n"
                "Factos do utilizador: {user_facts}\n\n{financial_context}\n{loaded_skills}"
            )

        # 6. Resolve skills for this agent + message
        loaded_skills = self._skill_resolver.resolve(agent.name, message)

        # 7. Build conversation history (last 20 messages)
        history: list[LLMMessage] = []
        if conversation_history:
            for msg in conversation_history[-20:]:
                history.append(LLMMessage(role=msg["role"], content=msg["content"]))

        # 8. Build context with real financial data + skills
        context = AgentContext(
            user_id=user_id,
            db=db,
            session_id=session_id,
            user_facts=user_facts,
            conversation_history=history,
            financial_context=financial_context,
            finance_context_type=finance_context,
            loaded_skills=loaded_skills,
        )

        # 8. Process through the specialist agent
        try:
            response = await agent.process(message, context)
        except RuntimeError as e:
            logger.error("Agent %s failed: %s", agent_name, e)
            return AgentResponse(
                content="O assistente de IA nao esta disponivel de momento. Por favor, tente novamente mais tarde.",
                agent_name="system",
            )

        # 9. Save messages to session memory
        await add_message_to_session(user_id, session_id, "user", message)
        await add_message_to_session(
            user_id, session_id, "assistant", response.content, response.agent_name
        )

        # 10. Track cost per agent
        if response.model and response.model != "unavailable":
            try:
                await track_agent_cost(
                    user_id, response.agent_name, response.model,
                    response.tokens_input, response.tokens_output,
                )
            except Exception:
                pass

        # 11. Extract facts from user message (non-blocking)
        try:
            await extract_facts_from_message(db, user_id, message)
        except Exception:
            logger.debug("Fact extraction skipped for message")

        # 11. Store conversation insight as embedding (non-blocking)
        if response.tool_calls_made:
            try:
                insight = f"Utilizador: {message}\nAssistente ({response.agent_name}): "
                for tc in response.tool_calls_made[:3]:
                    insight += f"[{tc['name']}] "
                insight += response.content[:200]
                await store_embedding(
                    db, user_id, insight,
                    metadata={"agent": response.agent_name, "session": session_id},
                )
                await db.commit()
            except Exception:
                logger.debug("Semantic memory storage unavailable")

        return response

    async def process_message_stream(
        self,
        user_id: uuid.UUID,
        session_id: str,
        message: str,
        db: AsyncSession,
        conversation_history: list[dict] | None = None,
        finance_context: str = "personal",
    ):
        """Process a message with real-time progress via AsyncGenerator.

        Yields SSE-ready dicts:
          {"type": "progress", "content": "A consultar saldos..."}
          {"type": "result", "content": "...", "agent": "...", "session_id": "..."}
        """
        # Steps 1-8 same as process_message
        user_facts = await get_user_facts(db, user_id)
        financial_context = await _load_user_financial_context(db, user_id, finance_context)

        try:
            similar = await search_similar(db, user_id, message, limit=3)
            if similar:
                financial_context += "\n\nCONTEXTO DE CONVERSAS ANTERIORES:\n"
                for s in similar:
                    financial_context += f"- {s.get('content', '')[:200]}\n"
        except Exception:
            pass

        if not conversation_history:
            session_data = await get_session(user_id, session_id)
            conversation_history = session_data.get("messages", [])

        last_agent = None
        if conversation_history:
            for msg in reversed(conversation_history):
                if msg.get("role") == "assistant" and msg.get("agent"):
                    last_agent = msg.get("agent")
                    break

        short_confirms = {"sim", "nao", "ok", "confirmo", "cancela", "correcto", "esta", "certo", "pode", "faz"}
        is_confirmation = message.strip().lower().rstrip("!.,?") in short_confirms

        if is_confirmation and last_agent and last_agent.upper() in self.agents:
            agent_name = last_agent.upper()
        else:
            yield {"type": "progress", "content": "A identificar o teu pedido..."}
            agent_name = await self.router_agent.classify_intent(message)

        agent = self.agents.get(agent_name)
        if not agent:
            agent = BaseAgent(self.llm_router)
            agent.name = "general"
            agent.system_prompt_template = (
                "És o assistente financeiro d'O Financeiro. "
                "Responde de forma útil em Português (Angola) com acentuação correcta. "
                "Não executes operações — apenas responde a perguntas gerais.\n\n"
                "Factos do utilizador: {user_facts}\n\n{financial_context}\n{loaded_skills}"
            )

        loaded_skills = self._skill_resolver.resolve(agent.name, message)

        history: list[LLMMessage] = []
        if conversation_history:
            for msg in conversation_history[-20:]:
                history.append(LLMMessage(role=msg["role"], content=msg["content"]))

        context = AgentContext(
            user_id=user_id, db=db, session_id=session_id,
            user_facts=user_facts, conversation_history=history,
            financial_context=financial_context,
            finance_context_type=finance_context,
            loaded_skills=loaded_skills,
        )

        # Stream through agent with real progress
        response = None
        try:
            async for event in agent.process_stream(message, context):
                if event["type"] == "progress":
                    yield event
                elif event["type"] == "done":
                    response = event["response"]
        except RuntimeError:
            yield {"type": "result", "content": "O assistente não está disponível de momento.", "agent": "system", "session_id": session_id}
            return

        if not response:
            yield {"type": "result", "content": "Erro ao processar pedido.", "agent": "system", "session_id": session_id}
            return

        # Post-processing (memory, facts, embeddings)
        await add_message_to_session(user_id, session_id, "user", message)
        await add_message_to_session(user_id, session_id, "assistant", response.content, response.agent_name)

        if response.model and response.model != "unavailable":
            try:
                await track_agent_cost(user_id, response.agent_name, response.model, response.tokens_input, response.tokens_output)
            except Exception:
                pass

        try:
            await extract_facts_from_message(db, user_id, message)
        except Exception:
            pass

        if response.tool_calls_made:
            try:
                insight = f"Utilizador: {message}\nAssistente ({response.agent_name}): "
                for tc in response.tool_calls_made[:3]:
                    insight += f"[{tc['name']}] "
                insight += response.content[:200]
                await store_embedding(db, user_id, insight, metadata={"agent": response.agent_name, "session": session_id})
                await db.commit()
            except Exception:
                pass

        await record_token_usage(user_id, response.tokens_input, response.tokens_output)

        yield {
            "type": "result",
            "content": response.content,
            "agent": response.agent_name,
            "session_id": session_id,
            "tokens_input": response.tokens_input,
            "tokens_output": response.tokens_output,
            "model": response.model or "",
        }
