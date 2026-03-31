# O Financeiro — Estratégia de IA

## Providers

| Provider | Utilização | API Key |
|----------|-----------|---------|
| **Anthropic** | Chat, agents, análise, OCR imagens | `ANTHROPIC_API_KEY` |
| **OpenAI** | Whisper (voz→texto), embeddings | `OPENAI_API_KEY` |

---

## Routing de Modelos

O sistema usa routing inteligente — o RouterAgent classifica a complexidade e direciona para o modelo adequado.

| Tarefa | Modelo | Input/Output médio | Custo por chamada |
|--------|--------|--------------------|--------------------|
| **Router** (classificar intent) | Claude Haiku 4.5 | 200 / 50 tokens | ~$0.0001 |
| **Conversação normal** (FAQ, consultas simples) | Claude Sonnet 4.6 | 500 / 300 tokens | ~$0.005 |
| **Análise complexa** (fiscal, patrimonial, simulações) | Claude Opus 4.6 | 1000 / 500 tokens | ~$0.045 |
| **Compreensão de imagens** (recibos, facturas, extractos) | Claude Opus 4.6 | 1500 / 400 tokens (com imagem) | ~$0.055 |
| **Voz → texto** | OpenAI Whisper | ~30 seg áudio | ~$0.006 |
| **Embeddings** (memória semântica) | OpenAI text-embedding-3-small | 200 tokens | ~$0.000004 |
| **Batch insights** (diário, automático) | Claude Haiku 4.5 | 800 / 200 tokens | ~$0.0004 |
| **Educação** (tips personalizados) | Claude Haiku 4.5 | 300 / 200 tokens | ~$0.0002 |
| **Notícias** (resumo mercado) | Claude Sonnet 4.6 | 2000 / 500 tokens | ~$0.012 |

### Preços base (Maio 2025)

| Modelo | Input (1M tokens) | Output (1M tokens) |
|--------|-------------------|---------------------|
| Claude Haiku 4.5 | $0.80 | $4.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Opus 4.6 | $15.00 | $75.00 |
| GPT-4o | $2.50 | $10.00 |
| Whisper | $0.006/min | — |
| text-embedding-3-small | $0.020/1M tokens | — |

---

## Custo Estimado por Utilizador

### Perfis de uso

| Acção | Baixo | Médio | Alto |
|-------|-------|-------|------|
| Mensagens chat/mês | 10 | 50 | 200 |
| Fotos recibos/mês | 0 | 5 | 20 |
| Comandos voz/mês | 0 | 2 | 15 |
| Consultas complexas/mês | 1 | 5 | 20 |
| Embeddings gerados/mês | 10 | 50 | 200 |

### Cálculo detalhado

#### Utilizador BAIXO (usa app 2-3x por semana)

| Componente | Cálculo | Custo |
|------------|---------|-------|
| Router (10 msgs) | 10 × $0.0001 | $0.001 |
| Sonnet (8 msgs simples) | 8 × $0.005 | $0.040 |
| Opus (1 análise + 1 consulta complexa) | 2 × $0.045 | $0.090 |
| Embeddings (10) | 10 × $0.000004 | $0.00004 |
| Batch insights (30 dias) | 30 × $0.0004 | $0.012 |
| **TOTAL** | | **~$0.14/mês** |

#### Utilizador MÉDIO (usa app diariamente)

| Componente | Cálculo | Custo |
|------------|---------|-------|
| Router (50 msgs) | 50 × $0.0001 | $0.005 |
| Sonnet (40 msgs normais) | 40 × $0.005 | $0.200 |
| Opus (5 análises complexas) | 5 × $0.045 | $0.225 |
| Opus OCR (5 recibos) | 5 × $0.055 | $0.275 |
| Whisper (2 comandos voz) | 2 × $0.006 | $0.012 |
| Embeddings (50) | 50 × $0.000004 | $0.0002 |
| Batch insights (30 dias) | 30 × $0.0004 | $0.012 |
| Notícias (30 resumos) | 30 × $0.012 | $0.360 |
| **TOTAL** | | **~$1.09/mês** |

#### Utilizador ALTO (power user, usa várias vezes ao dia)

| Componente | Cálculo | Custo |
|------------|---------|-------|
| Router (200 msgs) | 200 × $0.0001 | $0.020 |
| Sonnet (160 msgs normais) | 160 × $0.005 | $0.800 |
| Opus (20 análises complexas) | 20 × $0.045 | $0.900 |
| Opus OCR (20 recibos) | 20 × $0.055 | $1.100 |
| Whisper (15 comandos voz) | 15 × $0.006 | $0.090 |
| Embeddings (200) | 200 × $0.000004 | $0.0008 |
| Batch insights (30 dias) | 30 × $0.0004 | $0.012 |
| Notícias (30 resumos) | 30 × $0.012 | $0.360 |
| **TOTAL** | | **~$3.28/mês** |

### Resumo

| Perfil | Custo IA/mês | Plano do utilizador | Margem |
|--------|-------------|---------------------|--------|
| **Baixo** | ~$0.14 | Gratuito (0 Kz) | Negativa (subsidiado) |
| **Médio** | ~$1.09 | Pessoal (2.990 Kz ≈ $3.60) | ~$2.50 (69%) |
| **Alto** | ~$3.28 | Família+ (9.990 Kz ≈ $12) | ~$8.70 (73%) |

---

## Estratégia de Optimização de Custos

### 1. Cache de respostas (Redis)
- Perguntas frequentes idênticas → cache 24h
- Reduz 30-40% das chamadas Sonnet/Opus

### 2. Routing inteligente
- Haiku classifica a complexidade antes de escalar
- 70% das perguntas resolvem-se com Sonnet
- Só 10-15% precisam de Opus

### 3. Batch processing
- Insights diários gerados com Haiku (não Sonnet/Opus)
- Notícias resumidas uma vez por dia, servidas a todos

### 4. Prompt caching (Anthropic)
- System prompts dos agents são grandes e repetitivos
- Prompt caching reduz custo em ~90% para tokens repetidos

### 5. Limites por plano

| Plano | Mensagens chat | OCR recibos | Análises Opus |
|-------|---------------|-------------|---------------|
| Gratuito | 20/mês | 0 | 0 |
| Pessoal | 200/mês | 20/mês | 10/mês |
| Família | 500/mês | 50/mês | 30/mês |
| Família+ | Ilimitado | 100/mês | Ilimitado |

---

## Arquitectura Multi-Agent (9 Agents)

```
Utilizador → RouterAgent (Haiku) → Agent específico (Sonnet/Opus)
                                         ↓
                                    Tools (DB queries, calculations)
                                         ↓
                                    Resposta contextualizada
```

| Agent | Módulo | Tools | Modelo default |
|-------|--------|-------|----------------|
| Router | — | classify_intent | Haiku |
| Tracker | FIN.TXN | create_transaction, list_transactions, categorize, search | Sonnet |
| Advisor | FIN.AI | analyze_spending, get_recommendations, compare_periods, forecast | Opus |
| Budget | FIN.BUD | create_budget, check_status, suggest_adjustments | Sonnet |
| Goals | FIN.GOL | create_goal, check_progress, suggest_contribution | Sonnet |
| Family | FIN.FAM | list_members, analyze_contributions, suggest_splits | Sonnet |
| Report | FIN.RPT | generate_report, compare_periods | Sonnet |
| Debt | FIN.DEB | analyze_debt, simulate_payoff | Opus |
| Investment | FIN.INV | analyze_portfolio, simulate_growth | Opus |
| News | FIN.NEW | summarize_news, analyze_impact | Sonnet |

---

## Funcionalidades que Usam IA

### Em produção (com API keys)
1. **Chat assistente** — conversação natural sobre finanças
2. **OCR inteligente** — fotografar recibo → transacção automática
3. **Voz** — "gastei 5 mil no Kero" → cria transacção
4. **Insights automáticos** — "gastou 30% mais em transporte este mês"
5. **Educação personalizada** — tips baseados no perfil financeiro
6. **Notícias** — resumo diário de mercado com impacto pessoal
7. **Investment advisor** — análise de portfolio e recomendações
8. **Debt optimizer** — estratégia óptima de pagamento de dívidas

### Futuro
9. **Previsão de gastos** — ML sobre histórico
10. **Anomaly detection** — gastos invulgares
11. **Smart categories** — auto-categorização cada vez mais precisa
12. **Financial health score** — pontuação dinâmica

---

## Configuração no Railway

```bash
# Anthropic (obrigatório)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI (obrigatório para voz + embeddings)
OPENAI_API_KEY=sk-...

# O factory.py detecta automaticamente:
# - Com ambas keys: sistema completo
# - Sem keys: MockLLMProvider (dev/test)
```

---

*Última actualização: 2026-03-31*
