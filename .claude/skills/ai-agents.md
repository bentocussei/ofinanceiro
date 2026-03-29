---
description: Build and maintain the multi-agent AI system for O Financeiro
globs: ["apps/api/app/ai/**", "apps/api/app/agents/**", "apps/api/app/tools/**"]
---

# AI Multi-Agent System

## Architecture

O Financeiro uses a multi-agent architecture with 10 specialized agents coordinated by a Router Agent. See `docs/04_ARQUITECTURA_IA.md` and `diagramas/02_fluxo_multi_agente.mermaid`.

## Message Flow

1. User sends message → API loads context (session memory, user facts, account summary)
2. Router Agent classifies intent → selects specialist agent
3. Specialist Agent loads relevant skills/tools → sends to LLM
4. LLM responds with tool calls → Tool Dispatcher executes against DB
5. Result returned to LLM → formatted response to user
6. Async: Memory Extractor updates session/facts/embeddings

## Agent Implementation Pattern

```python
class BaseAgent:
    """All agents inherit from this base."""
    name: str
    description: str
    system_prompt: str
    tools: list[Tool]          # Function-calling tools available
    model: str                 # LLM model to use (cost tier)

    async def process(self, message: str, context: AgentContext) -> AgentResponse:
        """Process a user message with full context."""
        ...
```

## Tool Calling Pattern

Each agent has specific tools (functions) it can call:

- **Tracker**: add_transaction, get_balance, search_transactions, get_account_summary
- **Budget**: create_budget, get_budget_status, update_budget_item
- **Goals**: create_goal, update_goal_progress, simulate_goal
- **Family**: get_family_summary, get_member_expenses, get_child_expenses

Tools are Python functions with Pydantic schemas that map to database operations.

## Memory System

### Session Memory (Redis)
```python
# Store: last 20 messages, active agent, pending confirmations
await redis.setex(f"session:{user_id}", 86400, session_json)
```

### Fact Memory (PostgreSQL)
```python
# user_facts table: key-value pairs learned about user
# Examples: salary_day=25, has_children=true, primary_bank="BAI"
# Sources: explicit (user said), implicit (detected pattern), inferred (AI concluded)
```

### Semantic Memory (pgvector)
```python
# Embed conversation chunks for semantic search
# Used for: "last time I talked about..." queries
# Model: text-embedding-3-small
```

## LLM Provider Strategy

- Use LiteLLM or similar router for multi-provider support
- Implement fallback chain: primary → secondary → tertiary
- Cache common responses (category suggestions, greetings)
- Track token usage per user for cost management
- Redact PII before sending to LLMs (account numbers, full names in some contexts)

## Smart Insights Engine

Background cron job (daily) that:
1. Analyzes user's recent transactions
2. Compares against budgets, goals, patterns
3. Generates max 2 insights/day per user
4. Types: unusual_spending, budget_risk, balance_forecast, saving_opportunity, recurring_detected

## Key Rules

- Every agent response must include the agent name (for UI to show which agent responded)
- Tool calls must be confirmed by the user before executing write operations
- All LLM calls must have timeout and retry logic
- Token usage must be logged for cost tracking
- Never expose raw LLM errors to users — always graceful fallback
- Portuguese (pt-AO) in all user-facing responses
- Understand Angolan financial terminology (Kixikila, zungueira, candongueiro, etc.)
