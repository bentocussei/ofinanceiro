# O Financeiro — Arquitectura de Inteligência Artificial

**Versão:** 1.0
**Data:** 2026-03-28

---

## 1. Princípios de Design da IA

### 1.1 IA Nativa, Não Adicionada

A IA não é uma feature — é o produto. Cada funcionalidade do Financeiro é desenhada com IA como componente integral, não como camada adicionada sobre uma app tradicional.

### 1.2 Determinístico Onde Importa, Generativo Onde Diferencia

| Operação | Abordagem | Porquê |
|---|---|---|
| Cálculo de saldo | Determinístico (código) | Precisa ser exacto, sem margem para erro |
| Soma de gastos por categoria | Determinístico (SQL) | Dados financeiros requerem precisão absoluta |
| Categorização de transacções | LLM + regras | LLM classifica, regras validam |
| Geração de relatório | LLM (generativo) | Linguagem natural requer criatividade |
| Conselhos financeiros | LLM (generativo) | Personalização requer raciocínio |
| Detecção de anomalias | Determinístico + LLM | Cálculo estatístico + explicação natural |

**Princípio: o LLM nunca faz matemática.** Todas as operações numéricas são feitas por código determinístico. O LLM recebe os resultados e formula a resposta.

### 1.3 Privacidade por Design

- Dados financeiros nunca são usados para treinar modelos
- Contexto mínimo enviado ao LLM — apenas o necessário para a tarefa
- Dados pessoais redactados antes do envio quando possível
- Toda a memória do utilizador permanece encriptada no nosso backend

---

## 2. Arquitectura Multi-Agente

### 2.1 Visão Geral

```
Utilizador → [Input: texto/voz/imagem]
    ↓
Router Agent (classificação de intent)
    ↓
[Agente Especializado] ← Skills + Memória + Tools
    ↓
[Function Calls] → Backend API (operações determinísticas)
    ↓
[Resposta formatada] → Utilizador
```

### 2.2 Router Agent

O Router é o ponto de entrada. Recebe a mensagem bruta e decide qual agente deve tratar.

**Implementação:** Um LLM rápido e barato (Claude Haiku ou GPT-4o-mini) com um system prompt que lista os agentes disponíveis e exemplos de routing.

```python
ROUTER_PROMPT = """
Classifica a intenção do utilizador e encaminha para o agente correcto.

Agentes disponíveis:
- TRACKER: Registar transacção, consultar gastos, pesquisar histórico
- BUDGET: Criar/consultar orçamento, alertas de limite
- ADVISOR: Conselhos financeiros, análise de gastos, "posso comprar?"
- GOALS: Metas de poupança, progresso, recomendações
- FAMILY: Finanças familiares, contribuições, gastos por membro
- REPORT: Relatórios, resumos, comparações
- DEBT: Dívidas, empréstimos, amortização
- INVESTMENT: Investimentos, simulações, rendimentos
- NEWS: Notícias financeiras, câmbio, inflação
- GENERAL: Saudações, perguntas sobre a app, configurações

Responde APENAS com o nome do agente. Nada mais.
"""
```

### 2.3 Agentes Especializados

Cada agente tem:
- **System Prompt** — Instruções específicas do domínio
- **Skills** — Documentos Markdown com conhecimento especializado
- **Tools** — Functions que o agente pode invocar
- **Memória** — Acesso à memória do utilizador relevante para o domínio

#### Tracker Agent

```python
TRACKER_PROMPT = """
És o agente de tracking financeiro d'O Financeiro.

REGRAS:
1. Quando o utilizador diz que gastou/recebeu dinheiro, usa a tool add_transaction.
2. Infere a categoria com base na descrição. Se ambíguo, pergunta.
3. Se o utilizador não especificar a conta, usa a conta default.
4. Se o utilizador enviar foto, processa como recibo (OCR).
5. Confirma sempre a transacção antes de registar: "Registei: 5.000 Kz em Alimentação (Supermercado). Correcto?"
6. Usa os factos conhecidos sobre o utilizador para contextualizar.

CONTEXTO DO UTILIZADOR:
{user_facts}

SKILLS:
{loaded_skills}
"""
```

**Tools do Tracker:**
- `add_transaction(amount, type, category, subcategory, account_id, description, merchant, date)`
- `get_transactions(filters: {category, date_range, account, search_query})`
- `search_transactions(semantic_query)` — pesquisa semântica
- `update_transaction(id, fields)`
- `delete_transaction(id)`
- `process_receipt(image_base64)` — OCR multimodal
- `import_statement(file_base64, file_type)` — processar extracto

#### Advisor Agent

```python
ADVISOR_PROMPT = """
És o consultor financeiro pessoal d'O Financeiro.

REGRAS:
1. Usa SEMPRE dados reais do utilizador — nunca inventes números.
2. Chama get_spending e get_balance ANTES de dar conselhos.
3. Sê específico: "Podes poupar 15.000 Kz/mês se reduzires Uber em 40%" — não "tenta gastar menos."
4. Quando o utilizador pergunta "posso comprar X?", calcula o impacto real no orçamento e saldo.
5. Conhece o contexto angolano: custos de vida em Luanda, taxas de câmbio, inflação.
6. Nunca dês conselhos de investimento específicos — sugere que consulte um profissional.
7. Tom: directo e honesto, sem ser condescendente.

FACTOS DO UTILIZADOR:
{user_facts}

SKILLS:
{loaded_skills}
"""
```

### 2.4 Selecção de Modelo por Tarefa

| Tarefa | Modelo Recomendado | Razão | Custo Estimado |
|---|---|---|---|
| Routing | Claude Haiku / GPT-4o-mini | Rápido, barato, classificação simples | ~$0.0001/request |
| Categorização | Claude Haiku / GPT-4o-mini | Classificação curta, alta velocidade | ~$0.0001/request |
| Conversa geral | Claude Sonnet / GPT-4o | Equilíbrio qualidade/custo | ~$0.003/request |
| Análise financeira | Claude Sonnet / GPT-4o | Raciocínio complexo com dados | ~$0.005/request |
| Geração de relatório | Claude Sonnet | Texto longo e estruturado | ~$0.01/request |
| OCR de recibos | GPT-4o / Claude Sonnet | Visão multimodal | ~$0.01/image |
| OCR de extractos | GPT-4o | PDF multimodal, tabelas complexas | ~$0.02/page |
| Insights proactivos | Claude Haiku (batch) | Alto volume, pode ser batch | ~$0.0005/insight |

**Custo estimado por utilizador activo por mês:** $0.15-$0.50 (com cache agressivo)

---

## 3. Sistema de Memória

### 3.1 Três Camadas

#### Camada 1: Memória de Sessão (Redis)
- Contexto da conversa actual
- TTL: 24 horas (expira se inactivo)
- Contém: últimas 20 mensagens, agente activo, estado de workflow

#### Camada 2: Memória de Factos (PostgreSQL)
- Factos concretos sobre o utilizador
- Permanente (até ser corrigido)
- Formato: `{fact_type, fact_value, confidence, source, created_at}`

Exemplos de factos:
```json
[
  {"type": "salary_day", "value": "25", "confidence": 0.95, "source": "user_stated"},
  {"type": "salary_amount", "value": "450000", "confidence": 0.90, "source": "inferred_3_months"},
  {"type": "num_children", "value": "2", "confidence": 1.0, "source": "user_stated"},
  {"type": "rent_amount", "value": "150000", "confidence": 0.95, "source": "recurring_detected"},
  {"type": "primary_bank", "value": "BAI", "confidence": 0.85, "source": "inferred_account"},
  {"type": "spending_pattern", "value": "increases_pre_salary", "confidence": 0.80, "source": "analysis"}
]
```

#### Camada 3: Memória Semântica (pgvector)
- Embeddings de conversas e padrões passados
- Permite busca semântica: "da última vez que falámos sobre poupar para férias"
- Actualizada periodicamente (não em tempo real)

### 3.2 Construção de Memória

```
Mensagem do utilizador
    ↓
Agente processa e responde
    ↓
Memory Extractor (background, assíncrono)
    ├── Detecta factos explícitos → Camada 2
    ├── Detecta padrões → Camada 2
    └── Gera embedding → Camada 3
```

O Memory Extractor é um processo assíncrono que analisa cada conversa e extrai informações relevantes sem bloquear a resposta ao utilizador.

---

## 4. Function Calling (Tool Use)

### 4.1 Arquitectura

```
LLM decide invocar tool
    ↓
Tool Dispatcher (FastAPI)
    ↓
Tool Handler (lógica de negócio + DB)
    ↓
Resultado (JSON estruturado)
    ↓
LLM formula resposta com dados reais
```

### 4.2 Regras de Segurança

1. **Read-by-default** — A maioria das tools são read-only (consultar saldo, gastos, etc.)
2. **Confirm-before-write** — Tools que criam/modificam dados pedem confirmação ao utilizador
3. **Scope limitado** — Cada tool tem acesso apenas aos dados do utilizador autenticado
4. **Rate limiting** — Máximo de 50 tool calls por conversa para prevenir loops
5. **Audit log** — Toda a invocação de tool é registada com timestamp e resultado

### 4.3 Definição de Tools (JSON Schema)

```json
{
  "name": "add_transaction",
  "description": "Registar uma nova transacção (gasto ou receita)",
  "parameters": {
    "type": "object",
    "properties": {
      "amount": {"type": "number", "description": "Valor em moeda da conta"},
      "type": {"type": "string", "enum": ["expense", "income", "transfer"]},
      "category": {"type": "string", "description": "Categoria principal"},
      "subcategory": {"type": "string", "description": "Subcategoria (opcional)"},
      "account_id": {"type": "string", "description": "ID da conta (default: conta principal)"},
      "description": {"type": "string", "description": "Descrição da transacção"},
      "merchant": {"type": "string", "description": "Nome do estabelecimento"},
      "date": {"type": "string", "format": "date", "description": "Data (default: hoje)"}
    },
    "required": ["amount", "type", "category"]
  },
  "confirm_before_execute": true
}
```

---

## 5. Processamento Multimodal

### 5.1 OCR de Recibos

```
Utilizador envia foto
    ↓
Pré-processamento (resize, optimizar qualidade)
    ↓
LLM multimodal (GPT-4o ou Claude Sonnet)
    ↓
Prompt: "Extrai os seguintes campos deste recibo: estabelecimento, data, itens com preço, total, método de pagamento. Responde em JSON."
    ↓
JSON estruturado
    ↓
Validação (total = soma dos itens?)
    ↓
Pré-preenchimento de transacção para confirmação
```

### 5.2 Import de Extractos Bancários

```
Utilizador envia PDF/CSV
    ↓
Detecção de formato (PDF → multimodal, CSV → parsing)
    ↓
Se PDF: LLM multimodal extrai tabela de movimentos
Se CSV: Parser determinístico com detecção de colunas
    ↓
Lista de transacções candidatas
    ↓
Categorização automática por IA (batch)
    ↓
Preview para utilizador confirmar/corrigir
    ↓
Import em massa
```

### 5.3 Voz

```
Utilizador grava áudio
    ↓
Whisper API (speech-to-text)
    ↓
Texto transcrito
    ↓
Processado como input de texto normal pelo Router Agent
```

---

## 6. Smart Insights Engine

### 6.1 Arquitectura

O Smart Insights Engine corre em background (cron job diário/semanal) e gera insights proactivos.

```
Cron Job (diário 08:00)
    ↓
Para cada utilizador activo:
    ├── Buscar transacções dos últimos 7 dias
    ├── Comparar com médias históricas
    ├── Verificar orçamentos (% consumido)
    ├── Verificar metas (progresso)
    ├── Verificar dívidas (próximos vencimentos)
    ├── Detectar anomalias estatísticas
    └── Detectar padrões novos
    ↓
Pool de insights candidatos
    ↓
LLM (batch, barato) formula mensagens personalizadas
    ↓
Filtro de relevância (não enviar mais de 2/dia)
    ↓
Push notification + armazenar no chat
```

### 6.2 Regras de Insight

| Regra | Lógica | Exemplo |
|---|---|---|
| Gasto incomum | `txn.amount > 3 * avg(category, 30d)` | "Gastaste 45K em Uber — 3x mais que o normal" |
| Orçamento em risco | `spent / budget > 0.8 AND days_remaining > 5` | "Já usaste 80% do orçamento de restaurantes" |
| Previsão negativa | `projected_balance(salary_date) < min_threshold` | "Ao ritmo actual, ficas com 15K no dia 24" |
| Padrão sazonal | `spending(month) > spending(prev_month) * 1.2` | "Março está 20% acima de Fevereiro" |
| Oportunidade | `avg_surplus(3m) > threshold` | "Sempre te sobram ~40K. Que tal uma meta?" |
| Recorrência | `similar_txn detected in 3+ months` | "Detectei um gasto de 35K na DSTV todo mês. Queres tornar recorrente?" |

---

## 7. Cache e Optimização de Custos

### 7.1 Estratégia de Cache

| Camada | Tecnologia | O Que Cache | TTL |
|---|---|---|---|
| L1 — Respostas exactas | Redis | Queries idênticas já respondidas | 1 hora |
| L2 — Respostas semânticas | pgvector | Queries similares (cosine > 0.95) | 24 horas |
| L3 — Dados computados | Redis | Totais por categoria, saldos, métricas | 5 minutos |

### 7.2 Estimativa de Custos IA por Utilizador

| Cenário | Mensagens/Mês | Tools/Mês | Custo LLM | Custo/Mês |
|---|---|---|---|---|
| Utilizador Gratuito | 30 (5 perguntas/dia × 6 dias) | 50 | ~$0.05 | $0.05 |
| Utilizador Pessoal | 150 | 300 | ~$0.25 | $0.25 |
| Utilizador Família | 250 | 500 | ~$0.40 | $0.40 |
| Utilizador Intensivo | 500 | 1000 | ~$0.80 | $0.80 |

Com 3.000 utilizadores pagantes (meta M18): custo IA ~$750-$1.200/mês — sustentável com receita de $12.000/mês.

---

## 8. Escolha de Provider LLM

### 8.1 Avaliação

| Critério | Anthropic (Claude) | OpenAI (GPT-4o) | Google (Gemini) |
|---|---|---|---|
| Qualidade de raciocínio | Excelente | Excelente | Boa |
| Português angolano | Bom | Bom | Razoável |
| Multimodal (OCR) | Bom | Excelente | Bom |
| Function calling | Excelente | Excelente | Bom |
| Velocidade (Haiku/mini) | Excelente | Excelente | Boa |
| Custo | Competitivo | Competitivo | Mais barato |
| Fiabilidade API | Alta | Alta | Média |

### 8.2 Recomendação: Multi-Provider

| Tarefa | Provider Primário | Fallback |
|---|---|---|
| Routing + Categorização | Claude Haiku | GPT-4o-mini |
| Conversa + Conselhos | Claude Sonnet | GPT-4o |
| OCR de recibos | GPT-4o | Claude Sonnet |
| OCR de extractos | GPT-4o | Gemini Pro |
| Insights batch | Claude Haiku | GPT-4o-mini |
| Embeddings | text-embedding-3-small | — |

**Abstracção:** Implementar uma camada `LLMRouter` que selecciona o provider com base na tarefa e faz fallback automático em caso de erro.
