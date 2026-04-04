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

## 2. Comportamento sem servicos externos

Nenhum mock — todos os servicos retornam mensagem de indisponibilidade quando nao configurados.

| # | Item | Ficheiro | Comportamento sem API key |
|---|------|---------|--------------------------|
| 1 | **OTP SMS** | `apps/api/app/services/otp.py` | Log no console em dev (controlado por `settings.environment`) |
| 2 | **OCR** | `apps/api/app/services/ocr.py` | Retorna "Servico de OCR nao disponivel" |
| 3 | **Voice** | `apps/api/app/services/voice.py` | Retorna "Servico de transcricao nao disponivel" |
| 4 | **Embeddings** | `apps/api/app/ai/memory/semantic.py` | Operacoes ignoradas silenciosamente |
| 5 | **Chat IA** | `apps/api/app/ai/llm/router.py` | Retorna "Assistente nao disponivel de momento" |
| 6 | **News articles** | `apps/api/app/routers/news.py` | Dados estaticos (sem RSS/API real para Angola) |
| 7 | **Exchange rates** | `apps/api/app/routers/news.py` | Dados estaticos (sem API do BNA) |

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
| 5 | **Stripe keys (test)** | Railway env vars | ✅ Configurado em staging (test mode). Produção: trocar para live keys |
| 6 | **Stripe keys (live)** | Railway env vars | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — obter do dashboard Stripe |
| 7 | **File storage** | Railway env vars | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` — para OCR, imports, avatars (Phase 5) |
| 8 | **Sentry DSN** | Railway env vars | Monitoring (Phase 6) |
| 9 | **PostHog key** | Railway env vars | Analytics (Phase 6) |

---

## 4.1 Tarefas Agendadas (Cron Jobs)

| # | Tarefa | Frequência | Endpoint / Comando | O que faz |
|---|--------|-----------|-------------------|-----------|
| 1 | **Notification Scheduler** | A cada hora | `POST /api/v1/notifications/check` | Verifica contas a pagar (7/3/1 dias), saldo baixo, orçamento em risco, metas atingidas. Cria notificações automáticas. |
| 2 | **Finance Snapshot** | Diário (00:00) | `POST /api/v1/snapshots/generate` | Gera resumo financeiro mensal (receitas, despesas, net worth, score). |
| 3 | **Bill Overdue Check** | Diário (08:00) | Incluído no Notification Scheduler | Marca facturas como OVERDUE quando passam a data de vencimento. |
| 4 | **Auto-Billing** | Diário (06:00) | `POST /api/v1/billing/auto-billing` | Cobra subscricoes com `auto_renew=True` e `end_date` proximo. Renova ou marca PAST_DUE/EXPIRED. |

**Como configurar no Railway:**
```bash
# Opção 1: Railway Cron Service
# Criar um serviço do tipo "Cron" no Railway que chama os endpoints via curl

# Notificações — a cada hora
curl -X POST https://api.ofinanceiro.ao/api/v1/notifications/check \
  -H "Authorization: Bearer $SERVICE_TOKEN"

# Snapshots — diariamente à meia-noite
curl -X POST https://api.ofinanceiro.ao/api/v1/snapshots/generate \
  -H "Authorization: Bearer $SERVICE_TOKEN"
```

**Nota:** Os endpoints acima requerem autenticação. Em produção, criar um `SERVICE_TOKEN` com permissões de admin para os cron jobs, ou usar um endpoint interno sem auth (protegido por rede privada do Railway).

---

## 5. File Storage (Supabase Storage / S3 / Cloudflare R2)

Necessário configurar um serviço de storage para ficheiros antes das funcionalidades que dependem dele.

| # | Funcionalidade | Tipo de Ficheiro | Estratégia | Fase | Notas |
|---|---------------|-----------------|------------|------|-------|
| 1 | **OCR de recibos** | Fotos (JPEG/PNG) do utilizador | Guardar em storage | Phase 5 | Utilizador pode rever, anexar a transacção. Reter enquanto conta activa |
| 2 | **Import de extractos** | CSV/Excel bancários | Guardar em storage | Phase 5 | Auditoria, possibilidade de re-processar. Reter 1 ano |
| 3 | **Avatar do utilizador** | Imagem de perfil (JPEG/PNG) | Guardar em storage | Já existe no modelo (`User.avatar_url`) | Mostrado em toda a app. Limitar a 2MB |
| 4 | **Facturas/Recibos PDF** | PDF gerado pelo sistema | On-demand (não guardar) | Implementado | Gerado em memória com ReportLab a cada pedido. Campo `pdf_storage_key` preparado para cache futuro |
| 5 | **Audio (input por voz)** | Audio temporário (WAV/WebM) | Temporário — processar e apagar | Phase 5 | Enviar ao Whisper API, obter texto, descartar audio. Não guardar permanentemente |
| 6 | **Relatórios exportados** | PDF/Excel gerado pelo sistema | On-demand (não guardar) | Phase 6 | Dados mudam, gerar sempre fresco. Sem necessidade de storage |

**Configuração necessária:**
- Criar bucket S3-compatible (Cloudflare R2 recomendado — mais barato, sem egress fees)
- Variáveis de ambiente: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`
- Ou Supabase Storage se já usarmos Supabase para auth

**Regras de storage:**
- Ficheiros do utilizador isolados por `user_id/` prefix
- Limite de upload: 10MB para fotos, 50MB para extractos
- Audio temporário: apagar após processamento (max 5 minutos de retenção)
- Backups: incluir bucket no plano de backup

---

## 6. Items Temporários (Remover Antes de Produção)

| # | Item | Ficheiros | Razão | Quando Remover |
|---|------|-----------|-------|----------------|
| 1 | **Webhook Biometrid (teste)** | `apps/api/app/routers/webhooks.py`, `apps/api/app/main.py` (import + include_router) | Endpoint temporário para testar se a Biometrid envia callbacks correctamente | Após concluir testes de integração com Biometrid. Remover o ficheiro `webhooks.py` e as referências no `main.py` |

---

## 6. Regras

1. **Só se adiciona mock/TODO quando há dependência externa não disponível** (API key, serviço terceiro, hardware)
2. **Tudo o que pode ser implementado já, deve ser implementado** — sem desculpas
3. **Cada mock/TODO adicionado deve ser registado neste documento** com: ficheiro, razão, e quando resolver
4. **Antes do deploy para produção**, todos os items das secções 1 e 4 devem estar resolvidos
5. **Mock providers mantêm-se permanentemente** como fallback para dev/test — não são items para resolver

---

*Última actualização: 2026-04-03*
