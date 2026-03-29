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
| 2 | **OTP log em dev** | `apps/api/app/services/otp.py` linha 84 | Sem Twilio em dev, OTP é logado: `logger.info("DEV MODE — OTP para %s: %s")` | Mantém-se — behaviour controlado por `settings.environment` |

---

## 3. Agents Parcialmente Implementados

| # | Agent | Estado Actual | Fase Planeada | Fallback |
|---|-------|--------------|---------------|----------|
| 1 | **TrackerAgent** | ✅ Completo (4 tools) | Phase 2 Sem 12 | — |
| 2 | **AdvisorAgent** | ✅ Completo (4 tools) | Phase 2 Sem 14 | — |
| 3 | **BudgetAgent** | ❌ Não implementado | Phase 3 | Resposta genérica via BaseAgent |
| 4 | **GoalsAgent** | ❌ Não implementado | Phase 3 | Resposta genérica via BaseAgent |
| 5 | **FamilyAgent** | ❌ Não implementado | Phase 4 | Resposta genérica via BaseAgent |
| 6 | **ReportAgent** | ❌ Não implementado | Phase 6 | Resposta genérica via BaseAgent |
| 7 | **DebtAgent** | ❌ Não implementado | Phase 7 | Resposta genérica via BaseAgent |
| 8 | **InvestmentAgent** | ❌ Não implementado | Phase 7 | Resposta genérica via BaseAgent |
| 9 | **NewsAgent** | ❌ Não implementado | Phase 7 | Resposta genérica via BaseAgent |

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
