"""Chat orchestrator — routes messages through agents and manages conversation."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.agents.base import AgentContext, AgentResponse
from app.ai.agents.router_agent import RouterAgent
from app.ai.agents.tracker_agent import TrackerAgent
from app.ai.llm.base import LLMMessage
from app.ai.llm.router import LLMRouter


class ChatOrchestrator:
    """Orchestrates the multi-agent chat system."""

    def __init__(self, router: LLMRouter) -> None:
        self.llm_router = router
        self.router_agent = RouterAgent(router)

        # Register specialist agents
        self.agents = {
            "TRACKER": TrackerAgent(router),
            # Future agents will be added here:
            # "ADVISOR": AdvisorAgent(router),
            # "BUDGET": BudgetAgent(router),
            # "GOALS": GoalsAgent(router),
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

        # 1. Route to the correct agent
        agent_name = await self.router_agent.classify_intent(message)

        # 2. Get the agent (fallback to TRACKER for unimplemented agents)
        agent = self.agents.get(agent_name)
        if not agent:
            # For unimplemented agents, use a generic response
            from app.ai.agents.base import BaseAgent

            agent = BaseAgent(self.llm_router)
            agent.name = agent_name.lower()
            agent.system_prompt_template = (
                "És o assistente financeiro d'O Financeiro. "
                "Responde de forma útil em Português (Angola). "
                "Factos do utilizador: {user_facts}\n{loaded_skills}"
            )

        # 3. Build context
        history = []
        if conversation_history:
            for msg in conversation_history[-20:]:  # Last 20 messages
                history.append(LLMMessage(role=msg["role"], content=msg["content"]))

        context = AgentContext(
            user_id=user_id,
            db=db,
            session_id=session_id,
            conversation_history=history,
        )

        # 4. Process through the specialist agent
        response = await agent.process(message, context)

        return response
