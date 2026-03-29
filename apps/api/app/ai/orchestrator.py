"""Chat orchestrator — routes messages through agents and manages conversation."""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.advisor_agent import AdvisorAgent
from app.ai.agents.base import AgentContext, AgentResponse
from app.ai.agents.budget_agent import BudgetAgent
from app.ai.agents.family_agent import FamilyAgent
from app.ai.agents.goals_agent import GoalsAgent
from app.ai.agents.report_agent import ReportAgent
from app.ai.agents.router_agent import RouterAgent
from app.ai.agents.tracker_agent import TrackerAgent
from app.ai.llm.base import LLMMessage
from app.ai.llm.router import LLMRouter
from app.ai.memory.extractor import extract_facts_from_message
from app.ai.memory.facts import get_user_facts
from app.ai.memory.session import add_message_to_session, get_session

logger = logging.getLogger(__name__)


class ChatOrchestrator:
    """Orchestrates the multi-agent chat system."""

    def __init__(self, router: LLMRouter) -> None:
        self.llm_router = router
        self.router_agent = RouterAgent(router)

        # Register specialist agents
        self.agents = {
            "TRACKER": TrackerAgent(router),
            "ADVISOR": AdvisorAgent(router),
            "BUDGET": BudgetAgent(router),
            "GOALS": GoalsAgent(router),
            "FAMILY": FamilyAgent(router),
            "REPORT": ReportAgent(router),
            # Remaining agents added in their respective phases:
            # "DEBT": DebtAgent(router),         — Phase 7
            # "INVESTMENT": InvestmentAgent(router), — Phase 7
            # "NEWS": NewsAgent(router),         — Phase 7
        }

    async def process_message(
        self,
        user_id: uuid.UUID,
        session_id: str,
        message: str,
        db: AsyncSession,
        conversation_history: list[dict] | None = None,
    ) -> AgentResponse:
        """Process a user message through the multi-agent system."""

        # 1. Load user facts from memory
        user_facts = await get_user_facts(db, user_id)

        # 2. Load session history from Redis (if no history provided)
        if not conversation_history:
            session_data = await get_session(user_id, session_id)
            conversation_history = session_data.get("messages", [])

        # 3. Route to the correct agent
        agent_name = await self.router_agent.classify_intent(message)

        # 4. Get the agent (fallback for unimplemented agents)
        agent = self.agents.get(agent_name)
        if not agent:
            from app.ai.agents.base import BaseAgent

            agent = BaseAgent(self.llm_router)
            agent.name = agent_name.lower()
            agent.system_prompt_template = (
                "És o assistente financeiro d'O Financeiro. "
                "Responde de forma útil em Português (Angola). "
                "Factos do utilizador: {user_facts}\n{loaded_skills}"
            )

        # 5. Build context with facts and history
        history = []
        if conversation_history:
            for msg in conversation_history[-20:]:
                history.append(LLMMessage(role=msg["role"], content=msg["content"]))

        context = AgentContext(
            user_id=user_id,
            db=db,
            session_id=session_id,
            user_facts=user_facts,
            conversation_history=history,
        )

        # 6. Process through the specialist agent
        response = await agent.process(message, context)

        # 7. Save messages to session memory (Redis)
        await add_message_to_session(user_id, session_id, "user", message)
        await add_message_to_session(
            user_id, session_id, "assistant", response.content, response.agent_name
        )

        # 8. Extract facts from user message (non-blocking)
        try:
            await extract_facts_from_message(db, user_id, message)
        except Exception:
            logger.exception("Failed to extract facts from message")

        return response
