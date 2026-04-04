# ADR-009: Conversacao por Voz (Speech-to-Speech)

**Data:** 2026-04-04
**Estado:** Aprovado (futuro)
**Contexto:** O Financeiro como assistente financeiro conversacional

---

## Decisao

Implementar conversacao por voz com o assistente financeiro usando a OpenAI Realtime API, permitindo ao utilizador falar directamente com o assistente e ouvir a resposta em audio.

## Contexto

Angola tem uma forte cultura oral. Muitos utilizadores preferem falar a escrever, especialmente em mobile. A conversacao por voz elimina a barreira da escrita e torna o assistente financeiro mais acessivel.

Actualmente temos:
- **Transcricao** (voz para texto): utilizador fala, sistema converte para texto e processa como mensagem de chat
- **Conversacao por voz** (speech-to-speech): utilizador fala, assistente responde em audio — experiencia natural como falar ao telefone

## Abordagem tecnica

### Opcao A: Pipeline (STT + LLM + TTS)
```
Audio entrada → Transcricao → LLM (texto) → TTS → Audio saida
```
- Mais latencia (3 modelos em serie)
- Mais facil de implementar
- Perde nuances de tom e emocao

### Opcao B: Speech-to-Speech nativo (Realtime API)
```
Audio entrada → Modelo unico → Audio saida
```
- Baixa latencia (~500ms)
- Mais natural e expressivo
- Preserva contexto emocional
- API WebSocket

**Decisao: Opcao B** — usar a OpenAI Realtime API para a melhor experiencia possivel.

## Implementacao

### Fase 1: Mobile (prioritario)
- Botao de microfone no chat
- WebSocket para Realtime API
- Indicador visual de "a ouvir" / "a falar"
- Transcricao em tempo real (o utilizador ve o que disse)
- Resposta em audio + texto

### Fase 2: Web (opcional)
- Mesmo fluxo mas menos prioritario ("ninguem fala para o PC no escritorio")
- Util para acessibilidade

### Modelo
- **Lancamento da feature:** `gpt-realtime` ou modelo mais recente disponivel
- **Fallback:** Pipeline (transcricao + LLM + TTS) se Realtime API indisponivel

### Custos estimados
- Realtime API: ~$0.06/minuto (input audio) + ~$0.24/minuto (output audio)
- Conversa media: 2-3 minutos = ~$0.60-$0.90
- Impacto: +$0.10-$0.30/utilizador activo/mes (nem todos usarao voz)

## Restricoes

- **PII**: redaccao de dados sensiveis antes de enviar ao modelo (nomes, numeros de conta)
- **Idioma**: Portugues (Angola) — verificar qualidade de reconhecimento
- **Offline**: nao disponivel offline — requer internet estavel
- **Ruido**: ambientes ruidosos podem afectar qualidade — indicar ao utilizador

## Cronograma

| Fase | Quando | O que |
|------|--------|-------|
| Transcricao (actual) | Lancamento | Voz para texto, ja implementado |
| Conversacao por voz | Pos-lancamento (mes 6-8) | Realtime API, mobile first |
| Melhoria continua | Ongoing | Voz personalizada, dialecto angolano |

## Referencias

- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Audio and Speech Guide](https://developers.openai.com/api/docs/guides/audio)
- [gpt-realtime](https://openai.com/index/introducing-gpt-realtime/)
