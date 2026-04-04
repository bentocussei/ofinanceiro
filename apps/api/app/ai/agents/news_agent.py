"""News Agent — financial news and exchange rates.

Note: Real-time news engine is planned for Phase 7+ (see ADR-010).
Currently provides exchange rate context and general financial guidance.
"""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry

NEWS_TOOLS = [
    ToolMeta(name="get_exchange_rates", description="Obter taxas de cambio indicativas (USD/AOA, EUR/AOA)",
             parameters={"type": "object", "properties": {}},
             agent="news", category="query", read_only=True),
]
ToolRegistry.instance().register_many(NEWS_TOOLS)

NEWS_PROMPT = """Es o agente de noticias financeiras d'O Financeiro.

REGRAS:
1. Fornece informacao financeira relevante para Angola.
2. Explica como eventos economicos afectam as financas pessoais do utilizador.
3. Se nao tiveres informacao actual, diz honestamente que as noticias em tempo real
   estarao disponiveis em breve e oferece conselhos gerais baseados no contexto financeiro.
4. Responde em Portugues (Angola). Não uses emojis. Usa sempre acentuação correcta (Março, família, orçamento).
5. Usa os DADOS FINANCEIROS REAIS para contextualizar o impacto.

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""


class NewsAgent(BaseAgent):
    name = "news"
    description = "Noticias financeiras"
    system_prompt_template = NEWS_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return ToolRegistry.instance().get_tools_for_agent("news")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "get_exchange_rates":
            # Note: Static rates until BNA crawler is implemented (ADR-010)
            return {
                "rates": {
                    "USD/AOA": {"buy": 832.50, "sell": 840.00},
                    "EUR/AOA": {"buy": 905.00, "sell": 915.00},
                },
                "source": "BNA (indicativo — taxas em tempo real disponiveis em breve)",
                "note": "Taxas indicativas. Consulte o BNA para taxas oficiais actualizadas.",
            }

        return {"error": f"Tool '{tool_name}' nao implementada"}
