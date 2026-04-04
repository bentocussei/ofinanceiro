# ADR-010: News Engine — Agregacao de Noticias Financeiras em Tempo Real

**Data:** 2026-04-04
**Estado:** Aprovado (fase dedicada)
**Contexto:** Manter utilizadores actualizados com noticias financeiras relevantes para Angola

---

## Decisao

Implementar um news engine completo como fase dedicada (Phase 7+), com ingestao multi-fonte, deduplicacao, traducao, classificacao por relevancia, e notificacoes personalizadas.

## Problema

Os dados de noticias actuais sao estaticos (hardcoded). Para uma plataforma financeira seria, os utilizadores precisam de:
- Noticias financeiras actualizadas em tempo real
- Taxas de cambio do BNA actualizadas diariamente
- Analise de impacto personalizada nas suas financas
- Alertas sobre eventos que afectam o mercado angolano

## Fontes de dados

### Angola / Africa (prioritarias)
| Fonte | Tipo | RSS | Crawler necessario |
|---|---|---|---|
| BNA (Banco Nacional de Angola) | Cambios, politica monetaria | Nao | Sim |
| Jornal de Angola | Noticias economia | Provavel | Verificar |
| Expansao (Angola) | Negocios, economia | Provavel | Verificar |
| Folha 8 | Politica, economia | Sim | Nao |
| Portal de Angola | Multi-tematico | Sim | Nao |
| AllAfrica | Agregador 120+ fontes | Sim | Nao |
| Financial Afrik | Financas Africa | Sim | Nao |

### Internacionais
| Fonte | Tipo | Acesso |
|---|---|---|
| Google News (Angola/Finance) | Agregador | MCP disponivel |
| EODHD | Dados financeiros + sentimento | API paga |
| Bloomberg Africa | Mercados | API paga |
| Reuters Africa | Noticias | API paga |

### MCPs disponiveis
- Finance News RSS MCP — base RSS
- RSS Crawler MCP — crawling + cache
- Google News MCP — Google News por categoria/localizacao
- Mansa African Markets MCP — mercados africanos
- EODHD MCP — dados financeiros + sentimento
- News Aggregator MCP — 31 fontes

## Arquitectura

```
Fontes (RSS + Crawler + API)
  |
  v
Ingestao (cron: cada 15min-1h)
  |
  v
Pipeline de processamento:
  1. Fetch artigos novos
  2. Deduplicacao (hash de titulo + URL)
  3. Traducao (EN/FR → PT via Claude Haiku)
  4. Classificacao de relevancia (Claude Haiku)
  5. Resumo (Claude Haiku — 2-3 frases)
  6. Analise de sentimento (positivo/negativo/neutro)
  7. Embeddings (OpenAI — para search semantico)
  8. Guardar na BD (articles table)
  |
  v
Servir ao utilizador:
  - Feed personalizado (baseado em perfil financeiro)
  - Analise de impacto pessoal (Claude Sonnet)
  - Perguntas sobre noticias (RAG com embeddings)
  - Push notifications (noticias de alto impacto)
```

## Modelos de dados

### Article
- id, source, source_url, original_language
- title, summary, content, image_url
- published_at, fetched_at
- category (economia, cambios, politica_monetaria, mercados, etc.)
- sentiment (positive, negative, neutral)
- relevance_score (0-100)
- embedding (pgvector)
- is_translated, original_title

### NewsSource
- id, name, url, type (rss, api, crawler)
- fetch_frequency, last_fetched_at
- is_active, language, country

### ExchangeRate (BNA)
- id, date, currency_code, buy_rate, sell_rate
- source (bna, manual)

## Custos estimados

| Componente | Custo/mes (10.000 artigos) |
|---|---|
| Traducao (Haiku) | ~$5 |
| Classificacao (Haiku) | ~$2 |
| Resumos (Haiku) | ~$3 |
| Embeddings (OpenAI) | ~$0.20 |
| APIs pagas (opcional) | $0-$50 |
| **Total** | **~$10-$60/mes** |

## Cronograma

| Fase | Quando | O que |
|---|---|---|
| 1. Fontes RSS | Semana 1-2 | Integrar RSS feeds angolanos + AllAfrica |
| 2. Crawler BNA | Semana 2-3 | Taxas de cambio diarias do BNA |
| 3. Pipeline IA | Semana 3-4 | Traducao + classificacao + resumo + sentimento |
| 4. Embeddings + RAG | Semana 4-5 | Search semantico, perguntas sobre noticias |
| 5. Personalizacao | Semana 5-6 | Impacto pessoal, feed personalizado |
| 6. Push notifications | Semana 6-7 | Alertas de noticias de alto impacto |

## Referencias

- Finance News RSS MCP: https://lobehub.com/mcp/jvenkatasandeep-finance-news-mcp
- Mansa African Markets: https://glama.ai/mcp/servers/HeyZod/mansa-african-markets-mcp
- Angola News RSS: https://rss.feedspot.com/angola_news_rss_feeds/
- AllAfrica RSS: https://allafrica.com/misc/tools/rss.html
- EODHD News API: https://eodhd.com/financial-apis/stock-market-financial-news-api
