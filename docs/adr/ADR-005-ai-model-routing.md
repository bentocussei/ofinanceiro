# ADR-005: Routing de Modelos IA (Anthropic + OpenAI)

**Data:** 2026-03-31
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

A plataforma usa IA extensivamente: 9 agents conversacionais, OCR de recibos, voz, embeddings, insights automáticos. Precisa de balancear qualidade vs custo.

## Decisão

### Providers
- **Anthropic** — conversação, análise, OCR (primário)
- **OpenAI** — Whisper (voz→texto), embeddings (único provider)

### Routing por Tarefa

| Tarefa | Modelo | Custo/chamada |
|--------|--------|---------------|
| Router (classificar intent) | Claude Haiku 4.5 | ~$0.0001 |
| Conversação normal | Claude Sonnet 4.6 | ~$0.005 |
| Análise complexa | Claude Opus 4.6 | ~$0.045 |
| OCR imagens (recibos) | Claude Opus 4.6 | ~$0.055 |
| Voz → texto | OpenAI Whisper | ~$0.006 |
| Embeddings | text-embedding-3-small | ~$0.000004 |
| Batch insights | Claude Haiku 4.5 | ~$0.0004 |

### Factory Pattern
`app/ai/llm/factory.py` detecta automaticamente:
- Com API keys → provider real
- Sem API keys → MockLLMProvider (dev/test)

## Alternativas Consideradas

1. **Só Anthropic** — não tem Whisper nem embeddings
2. **Só OpenAI** — agents construídos para Claude, tool use format diferente
3. **Anthropic + OpenAI + Gemini** — complexidade extra sem benefício

## Consequências

- Custo por utilizador: $0.14 (baixo) a $3.28 (alto) /mês
- Haiku para routing mantém custos baixos (70% das chamadas)
- Opus reservado para análise que justifica o custo
- Prompt caching Anthropic reduz custos adicionais ~90%
