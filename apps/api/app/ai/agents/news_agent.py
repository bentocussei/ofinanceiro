"""News Agent — financial news, exchange rates, web search.

Uses Anthropic's native web_search tool for real-time information
and web_fetch for reading specific URLs.
"""

from app.ai.agents.base import AgentContext, BaseAgent
from app.ai.llm.base import ToolDefinition
from app.ai.llm.router import TaskType
from app.ai.tools import ToolMeta, ToolRegistry

NEWS_TOOLS = [
    ToolMeta(name="get_exchange_rates", description="Obter taxas de câmbio indicativas (USD/AOA, EUR/AOA)",
             parameters={"type": "object", "properties": {}},
             agent="news", category="query", read_only=True),
    ToolMeta(name="web_search", description="Pesquisar na internet por notícias, taxas, eventos financeiros — usar para informação actualizada em tempo real",
             parameters={"type": "object", "properties": {
                 "query": {"type": "string", "description": "Consulta de pesquisa (curta, 1-6 palavras)"},
             }, "required": ["query"]},
             agent="news", category="query", read_only=True),
    ToolMeta(name="web_fetch", description="Aceder a uma página web e extrair conteúdo — usar para ler artigos, páginas de notícias, dados do BNA",
             parameters={"type": "object", "properties": {
                 "url": {"type": "string", "description": "URL completo da página (https://)"},
                 "prompt": {"type": "string", "description": "O que extrair da página"},
             }, "required": ["url"]},
             agent="news", category="query", read_only=True),
]
ToolRegistry.instance().register_many(NEWS_TOOLS)

NEWS_PROMPT = """És o agente de notícias financeiras d'O Financeiro.

REGRAS:
1. Fornece informação financeira relevante para Angola.
2. Explica como eventos económicos afectam as finanças pessoais do utilizador.
3. Usa web_search para obter informação actualizada em tempo real — NÃO uses dados estáticos quando podes pesquisar.
4. Usa web_fetch para ler páginas específicas (BNA, jornais angolanos, etc.).
5. Inclui SEMPRE as fontes com links quando usares informação da web.
6. Responde em Português (Angola). Não uses emojis. Usa sempre acentuação correcta.
7. Usa os DADOS FINANCEIROS REAIS para contextualizar o impacto.

FONTES RECOMENDADAS:
- BNA (Banco Nacional de Angola): bna.ao
- Jornal de Angola: jornaldeangola.ao
- Expansão: expansao.co.ao
- Mercado: mercado.co.ao

FACTOS DO UTILIZADOR:
{user_facts}

DADOS FINANCEIROS REAIS:
{financial_context}

{loaded_skills}"""


class NewsAgent(BaseAgent):
    name = "news"
    description = "Notícias financeiras e pesquisa web"
    system_prompt_template = NEWS_PROMPT
    task_type = TaskType.CONVERSATION

    def get_tools(self) -> list[ToolDefinition]:
        return ToolRegistry.instance().get_tools_for_agent("news")

    async def execute_tool(self, tool_name: str, arguments: dict, context: AgentContext) -> dict:
        if tool_name == "get_exchange_rates":
            return {
                "rates": {
                    "USD/AOA": {"buy": 832.50, "sell": 840.00},
                    "EUR/AOA": {"buy": 905.00, "sell": 915.00},
                },
                "source": "BNA (indicativo)",
                "note": "Taxas indicativas. Use web_search para taxas actualizadas do BNA.",
            }

        if tool_name == "web_search":
            from app.ai.tools.web import web_search
            query = arguments.get("query", "")
            return await web_search(query)

        if tool_name == "web_fetch":
            from app.ai.tools.web import web_fetch
            url = arguments.get("url", "")
            prompt = arguments.get("prompt", "")
            return await web_fetch(url, prompt)

        return {"error": f"Tool '{tool_name}' não implementada"}
