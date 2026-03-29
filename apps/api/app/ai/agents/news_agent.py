"""News Agent — financial news and exchange rates."""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType

NEWS_PROMPT = """És o agente de notícias financeiras d'O Financeiro.

REGRAS:
1. Fornece notícias financeiras relevantes para Angola.
2. Explica como notícias afectam as finanças pessoais do utilizador.
3. Mostra taxas de câmbio actuais.
4. Responde em Português (Angola).

FACTOS DO UTILIZADOR:
{user_facts}

{loaded_skills}"""


class NewsAgent(BaseAgent):
    name = "news"
    description = "Notícias financeiras"
    system_prompt_template = NEWS_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return [
            ToolDefinition(name="get_news", description="Obter últimas notícias financeiras", parameters={"type": "object", "properties": {}}),
            ToolDefinition(name="get_exchange_rates", description="Obter taxas de câmbio actuais", parameters={"type": "object", "properties": {}}),
        ]

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "get_exchange_rates":
            return {
                "rates": {"USD/AOA": {"buy": 832.50, "sell": 840.00}, "EUR/AOA": {"buy": 905.00, "sell": 915.00}},
                "source": "BNA",
            }
        if tool_name == "get_news":
            return {
                "news": [
                    {"title": "BNA mantém taxa de juro", "summary": "Taxa básica inalterada em 19,5%."},
                    {"title": "Kwanza estabiliza", "summary": "Câmbio estável no mercado oficial."},
                ]
            }
        return {"error": "Tool desconhecida"}
