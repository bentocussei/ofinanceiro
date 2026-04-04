# O Financeiro — Arquitectura do Agentic System (v2.0)

**Versão:** 2.0
**Data:** 2026-04-07
**Diagramas:** `diagramas/06_arquitectura_agentic_system.mermaid`, `diagramas/07_fluxo_mensagem_completo.mermaid`

---

## 1. Visão Geral

O Financeiro usa um sistema multi-agente com 9 agentes especializados, 8 skills dinâmicas, um registry centralizado de 27 tools, e streaming SSE com progresso em tempo real. Inspirado na arquitectura do Claude Code (`~/Developer/anthropic/`).

```
Utilizador → Frontend (SSE) → Orchestrator → Router → Agent → Tools → Services → DB
                                                  ↓
                                            SkillResolver → Skills (markdown)
                                                  ↓
                                            ToolRegistry → ToolMeta (metadata)
```

---

## 2. Componentes Principais

### 2.1 ChatOrchestrator (`app/ai/orchestrator.py`)

Ponto de entrada para todas as mensagens. Responsabilidades:
- Carregar contexto financeiro real (contas com IDs, categorias com IDs, transacções, orçamentos, metas, dívidas)
- Injectar data actual no contexto
- Classificar intent via RouterAgent
- Detectar confirmações ("sim", "ok") e re-rotear ao último agente
- Resolver skills dinâmicas por agente + mensagem
- Emitir eventos SSE de progresso em tempo real
- Guardar memória (sessão, facts, embeddings) após resposta

### 2.2 Agentes (`app/ai/agents/`)

| Agente | Ficheiro | Responsabilidade | Task Type |
|--------|----------|------------------|-----------|
| Router | `router_agent.py` | Classificar intent → nome do agente | ROUTING (Haiku) |
| Tracker | `tracker_agent.py` | Transacções: criar, editar, eliminar, consultar | CONVERSATION |
| Budget | `budget_agent.py` | Orçamentos: criar, verificar, sugerir | CONVERSATION |
| Advisor | `advisor_agent.py` | Conselhos financeiros, "posso comprar X?" | ANALYSIS |
| Goals | `goals_agent.py` | Metas de poupança: criar, progresso, simular | CONVERSATION |
| Family | `family_agent.py` | Finanças familiares: membros, contribuições | CONVERSATION |
| Report | `report_agent.py` | Relatórios mensais, score financeiro | REPORT_GENERATION |
| Debt | `debt_agent.py` | Dívidas: listar, simular payoff | CONVERSATION |
| Investment | `investment_agent.py` | Investimentos: listar, simular juros | CONVERSATION |
| News | `news_agent.py` | Notícias financeiras, pesquisa web, câmbio | CONVERSATION |

### 2.3 BaseAgent — Tool Execution Loop (`app/ai/agents/base.py`)

```python
async def process_stream(message, context) -> AsyncGenerator:
    yield {"type": "progress", "content": "A analisar..."}

    for iteration in range(10):  # max 10 iterations
        response = await llm.chat(messages, tools)

        if not response.tool_calls:
            yield {"type": "done", "response": AgentResponse(...)}
            return

        for tool_call in response.tool_calls:
            yield {"type": "progress", "content": TOOL_ACTIVITY[tool_call.name]}
            result = await execute_tool(tool_call.name, tool_call.arguments, context)
            # result appended to messages → LLM sees it next iteration

        yield {"type": "progress", "content": "A preparar resposta..."}
```

**Regras:**
- Tools executadas sequencialmente (DB session não é thread-safe)
- Abort cascade: se uma write tool falha, restantes write tools canceladas
- Read tools (is_read_only) continuam mesmo após abort
- Tool results capped a 2000 chars para não encher o contexto
- Compaction automática se mensagens excedem 100K tokens

### 2.4 Skills (`app/ai/skills/`)

Skills são módulos de conhecimento em markdown com frontmatter YAML, carregados do disco e injectados no system prompt dos agentes.

| Skill | Ficheiro | Agentes | Always? |
|-------|----------|---------|---------|
| Visualização | `visualization.md` | todos | Sim |
| Contexto Angolano | `angolan_finance.md` | tracker, budget, advisor, report, investment, news | Sim |
| Análise Transacções | `transaction_analysis.md` | tracker, advisor, report | Não (triggers) |
| Optimização Orçamento | `budget_optimization.md` | budget, advisor | Sim |
| Formatação Relatórios | `report_formatting.md` | report | Sim |
| Finanças Familiares | `family_finance.md` | family | Sim |
| Estratégia Dívidas | `debt_strategy.md` | debt | Sim |
| Planeamento Metas | `goal_planning.md` | goals | Sim |

**SkillResolver:** Selecciona skills por agente + triggers na mensagem. Budget de 5000 chars. Prioridade: always-on primeiro, depois trigger-based.

### 2.5 ToolRegistry (`app/ai/tools/registry.py`)

Registry centralizado com metadata rica:

```python
@dataclass(frozen=True)
class ToolMeta:
    name: str           # "add_transaction"
    description: str    # para o LLM
    parameters: dict    # JSON Schema
    agent: str          # "tracker"
    category: str       # "query" | "action" | "compute"
    read_only: bool     # True = safe for concurrent exec
    version: str        # "1.0"
```

**27 tools registadas**, 3 categorias:
- **query** (17): leitura directa da DB via SQLAlchemy ORM
- **action** (5): escrita via Service Layer (create_transaction, update_transaction, delete_transaction, create_budget, create_goal)
- **compute** (5): cálculos sem escrita (simulate_payoff, can_afford, simulate_goal, simulate_compound, suggest_budget)

**Regra fundamental:** Tools de escrita chamam SEMPRE o Service Layer. Nunca manipulam a DB directamente.

### 2.6 Web Tools (`app/ai/tools/web.py`)

| Tool | Como funciona | Agentes |
|------|--------------|---------|
| `web_search` | Anthropic API `web_search_20250305` (server-side) | news, advisor |
| `web_fetch` | httpx + markdownify (HTML→markdown) | news |

### 2.7 Service Layer (`app/services/`)

Contém todas as regras de negócio. Exemplo de `delete_transaction`:

```python
async def delete_transaction(db, txn):
    # 1. Reverter saldo na conta
    account = await db.get(Account, txn.account_id)
    if txn.type == "income":
        account.balance -= txn.amount
    elif txn.type == "expense":
        account.balance += txn.amount
    # 2. Eliminar transacção
    await db.delete(txn)
    await db.flush()
```

---

## 3. LLM Strategy

### 3.1 Providers

| Provider | Modelos | Uso |
|----------|---------|-----|
| Anthropic | Claude Haiku 4.5 | Routing, classificação (rápido, barato) |
| Anthropic | Claude Sonnet 4.6 | Conversação, análise, OCR, web search |
| OpenAI | text-embedding-3-small | Embeddings semânticos (pgvector) |

### 3.2 Retry e Fallback (`app/ai/llm/retry.py`)

- Exponential backoff: 500ms base, 32s max
- 429/529: retry com backoff
- 3 overloads consecutivos: fallback para modelo mais leve (sonnet→haiku)
- Provider fallback: Anthropic → OpenAI

### 3.3 Context Injection

O system prompt de cada agente recebe:
1. **Data actual** (dia/mês/ano)
2. **Perfil do utilizador** (nome, telefone, plano)
3. **Contas com IDs** (para selecção correcta)
4. **Categorias com IDs** (para atribuição correcta)
5. **Transacções recentes** (últimos 7 dias)
6. **Orçamentos activos** (limites e gastos)
7. **Metas activas** (progresso)
8. **Dívidas activas** (saldos)
9. **Skills carregadas** (conhecimento dinâmico)
10. **Conversas similares** (pgvector semantic search)

---

## 4. Memory System

### 4.1 Três Camadas

| Camada | Storage | TTL | Conteúdo |
|--------|---------|-----|----------|
| Session | Redis | 24h | Últimas 20 mensagens + último agente |
| Facts | PostgreSQL | Permanente | Factos extraídos (salário, empregador, hábitos) |
| Semantic | pgvector | Permanente | Embeddings de conversas para busca por similaridade |

### 4.2 Fluxo de Memória

1. **Antes da resposta:** Buscar facts + session + embeddings similares
2. **Após resposta:** Guardar mensagens na sessão, extrair facts, armazenar embedding

---

## 5. Frontend — Assistente

### 5.1 Arquitectura

```
AssistantChat.tsx
├── SSE Stream (fetch + ReadableStream)
│   ├── onProgress → mostra status real ("A consultar saldos...")
│   └── onResult → mostra resposta + detecta sonner
├── Markdown Renderer (react-markdown + remark-gfm)
│   ├── ```chart → InlineChart (Chart.js via react-chartjs-2)
│   ├── ```metrics → MetricCards (KPI cards)
│   └── links → target="_blank"
└── sendPrompt (click no gráfico → nova mensagem)
```

### 5.2 Visualizações Inline

| Componente | Tipos | Paleta |
|-----------|-------|--------|
| InlineChart | bar, horizontal_bar, doughnut, pie, line, area | 9-ramp Visualizer (teal, amber, blue, purple, green, coral, pink, red) |
| MetricCards | KPI com valor, trend, progress bar | Label 13px, value 24px weight 500 |

**Regras:** Nunca ASCII art. Sempre ````chart`/````metrics` blocks. O LLM decide autonomamente quando incluir gráficos.

### 5.3 Rotas

| Rota | Contexto | Componente |
|------|----------|-----------|
| `/assistant` | Personal | `AssistantChat context="personal"` |
| `/family/assistant` | Family | `AssistantChat context="family"` |

---

## 6. Endpoints

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/api/v1/chat/stream` | POST | Chat com SSE (progresso + resultado) |
| `/api/v1/chat/message` | POST | Chat sem streaming (resposta completa) |
| `/api/v1/chat/upload` | POST | Upload de ficheiro (OCR / importação) |
| `/api/v1/tools` | GET | Introspection de todas as tools registadas |

---

## 7. Segurança

- JWT com refresh token (15min access, 7d refresh)
- Redirect automático para /login quando sessão expira
- Todas as queries filtradas por `user_id` (isolamento de dados)
- PII redaction antes de enviar ao LLM (planeado)
- Rate limiting: 10 msg/dia (free), 100 (personal), 200 (family)
- CORS restrito a origens conhecidas
- X-Context header para separação personal/family

---

## 8. Ficheiros Chave

```
apps/api/app/ai/
├── orchestrator.py          # ChatOrchestrator — ponto de entrada
├── agents/
│   ├── base.py              # BaseAgent + process_stream + TOOL_ACTIVITY
│   ├── router_agent.py      # Intent classification
│   ├── tracker_agent.py     # 7 tools (CRUD transactions + categories + balance)
│   ├── budget_agent.py      # 3 tools
│   ├── advisor_agent.py     # 5 tools (inclui web_search)
│   ├── goals_agent.py       # 3 tools
│   ├── family_agent.py      # 3 tools
│   ├── report_agent.py      # 2 tools
│   ├── debt_agent.py        # 2 tools
│   ├── investment_agent.py  # 2 tools
│   └── news_agent.py        # 3 tools (inclui web_search + web_fetch)
├── skills/
│   ├── loader.py            # SkillLoader + SkillResolver
│   └── *.md                 # 8 skills de domínio
├── tools/
│   ├── registry.py          # ToolMeta + ToolRegistry
│   └── web.py               # web_search + web_fetch
├── llm/
│   ├── base.py              # LLMMessage, ToolDefinition, LLMProvider
│   ├── router.py            # Task-based model routing + retry
│   ├── anthropic_provider.py # Claude API (multimodal support)
│   ├── openai_provider.py   # OpenAI fallback
│   └── retry.py             # Exponential backoff + model fallback
├── memory/
│   ├── session.py           # Redis session (24h)
│   ├── facts.py             # User facts (PostgreSQL)
│   ├── semantic.py          # pgvector embeddings
│   └── extractor.py         # LLM-based fact extraction
├── compact.py               # Context compaction (100K threshold)
├── cost_tracker.py          # Per-agent cost tracking (Redis)
└── metering.py              # Message quota per plan
```
