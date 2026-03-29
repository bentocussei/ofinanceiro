# O Financeiro — Pre-Production Checklist

**Objectivo:** Tracking de tudo que precisa de ser resolvido antes de ir para produção.
Inclui: mocks que dependem de serviços externos, configurações pendentes, e items temporários.

**Regra:** Sempre que se adiciona um mock ou TODO ao código que depende de algo externo não disponível, deve ser documentado aqui. Items que podem ser implementados já NÃO devem ser mocks.

---

## 1. API Keys / Serviços Externos (Obrigatórios para Produção)

| # | Item | Ficheiro | Estado | Dependência |
|---|------|---------|--------|-------------|
| 1 | **Anthropic API Key** | `apps/api/app/config.py` → `anthropic_api_key` | Mock provider em dev | Conta Anthropic + chave API |
| 2 | **OpenAI API Key** | `apps/api/app/config.py` → `openai_api_key` | Mock provider em dev | Conta OpenAI + chave API |
| 3 | **Twilio SMS (OTP)** | `apps/api/app/config.py` → `twilio_account_sid`, `twilio_auth_token`, `twilio_phone_number` | Log no console em dev | Conta Twilio + número verificado para Angola (+244) |

**Impacto sem resolução:** Sem API keys, o assistente IA usa o MockLLMProvider (respostas determinísticas, não inteligentes). Sem Twilio, OTPs são logados no console em vez de enviados por SMS.

---

## 2. Mocks Legítimos (Desenvolvimento)

| # | Item | Ficheiro | Razão | Quando Remover |
|---|------|---------|-------|----------------|
| 1 | **MockLLMProvider** | `apps/api/app/ai/llm/mock_provider.py` | Fallback quando não há API keys configuradas | Nunca remover — manter como fallback dev/test. Em produção, as API keys reais são usadas automaticamente via `factory.py` |
| 2 | **OTP log em dev** | `apps/api/app/services/otp.py` | Sem Twilio em dev, OTP é logado no console | Mantém-se — controlado por `settings.environment` |
| 3 | **OCR mock** | `apps/api/app/services/ocr.py` | Sem API key multimodal, OCR usa mock LLM | Produção: usa GPT-4o/Sonnet real com API key |
| 4 | **Voice mock** | `apps/api/app/services/voice.py` | Sem API key OpenAI, retorna texto mock | Produção: usa Whisper real com API key |
| 5 | **Embeddings skip** | `apps/api/app/ai/memory/semantic.py` | Sem API key OpenAI, embeddings não são gerados | Produção: usa text-embedding-3-small com API key |

---

## 3. Agents Parcialmente Implementados

| # | Agent | Estado Actual | Fase Planeada | Fallback |
|---|-------|--------------|---------------|----------|
| 1 | **TrackerAgent** | ✅ Completo (4 tools) | Phase 2 Sem 12 | — |
| 2 | **AdvisorAgent** | ✅ Completo (4 tools) | Phase 2 Sem 14 | — |
| 3 | **BudgetAgent** | ✅ Completo (3 tools) | Phase 3 | — |
| 4 | **GoalsAgent** | ✅ Completo (3 tools) | Phase 3 | — |
| 5 | **FamilyAgent** | ✅ Completo (3 tools) | Phase 4 | — |
| 6 | **ReportAgent** | ✅ Completo (2 tools) | Phase 6 | — |
| 7 | **DebtAgent** | ✅ Completo (2 tools) | Phase 7 | — |
| 8 | **InvestmentAgent** | ✅ Completo (2 tools) | Phase 7 | — |
| 9 | **NewsAgent** | ✅ Completo (2 tools) | Phase 7 | — |

**Nota:** O orchestrator (`apps/api/app/ai/orchestrator.py`) faz fallback gracioso — agents não implementados recebem uma resposta genérica. Isto é by design, não um bug. Cada agent será implementado na sua fase respectiva.

---

## 4. Configurações de Produção Pendentes

| # | Item | Onde Configurar | Notas |
|---|------|----------------|-------|
| 1 | **JWT secrets** | Railway env vars | `JWT_SECRET`, `JWT_REFRESH_SECRET` — gerar com `openssl rand -hex 32` |
| 2 | **CORS origins** | Railway env vars | `ALLOWED_ORIGINS` — domínios de produção |
| 3 | **Database URL** | Railway auto-injection | PostgreSQL managed |
| 4 | **Redis URL** | Railway auto-injection | Redis managed |
| 5 | **Stripe keys** | Railway env vars | Para billing (Phase 6) |
| 6 | **Sentry DSN** | Railway env vars | Monitoring (Phase 6) |
| 7 | **PostHog key** | Railway env vars | Analytics (Phase 6) |

---

## 5. Regras

1. **Só se adiciona mock/TODO quando há dependência externa não disponível** (API key, serviço terceiro, hardware)
2. **Tudo o que pode ser implementado já, deve ser implementado** — sem desculpas
3. **Cada mock/TODO adicionado deve ser registado neste documento** com: ficheiro, razão, e quando resolver
4. **Antes do deploy para produção**, todos os items das secções 1 e 4 devem estar resolvidos
5. **Mock providers mantêm-se permanentemente** como fallback para dev/test — não são items para resolver

---

*Última actualização: 2026-03-29*
