# O Financeiro — Roadmap de Desenvolvimento (Detalhado)

**Versão:** 3.0 | **Data:** 2026-03-29

Cada tarefa está classificada por camada: **[API]** Backend, **[MOB]** Mobile, **[WEB]** Web, **[AI]** IA, **[TST]** Testes.
Cada funcionalidade referencia o ID do documento `02_MODULOS_FUNCIONALIDADES.md`.

**Regras:**
- Cada tarefa deve ser implementada completamente antes de avançar
- Se existe no backend, DEVE existir UI no mobile E na web (ver tabela paridade no CLAUDE.md)
- "Mirror" não é tarefa — cada ecrã/acção deve ser listado individualmente
- Testes obrigatórios: backend (pytest) + E2E web (Playwright) por fase
- Validação com protocolo de 7 fases (`.claude/skills/feature-validation.md`)

---

## ✅ Fase 0: Fundação (Semanas 1-4) — COMPLETA

### Semana 1: Setup
- [API] Monorepo Turborepo + FastAPI skeleton + config + Alembic init
- [WEB] Next.js 16 skeleton + Tailwind v4 + Shadcn UI v4
- [MOB] Expo SDK 55 skeleton + Expo Router
- [API] Docker Compose: PostgreSQL 17 (pgvector) + Redis 8

### Semana 2: Modelo de Dados Core
- [API] Enums StrEnum (14 tipos) + models (User, Account, Category, Transaction)
- [API] Pydantic v2 schemas com validação (centavos, limites)
- [API] Migration Alembic async + seed 84 categorias Angola
- [TST] 17 testes (enums, schemas, seed structure)

### Semana 3: Auth
- [API] POST /auth/register, /login, /otp/send, /otp/verify, /refresh
- [API] bcrypt hashing, JWT access (15min) + refresh (7d), OTP Redis + Twilio
- [API] Rate limiting Redis (100 req/min API, 20 msg/min chat, 5 OTP/10min)
- [API] get_current_user dependency (Bearer token)
- [TST] 18 testes (hash, JWT roundtrip, endpoints, validation)

### Semana 4: CRUD Core
- [API] CRUD /accounts (GET/POST/PUT/DELETE) + /accounts/summary + /accounts/transfer
- [API] CRUD /transactions (GET/POST/PUT/DELETE) + filtros (tipo, data, categoria, valor, search)
- [API] GET /categories (sistema + custom)
- [API] Categorização por regras (Angola keywords) integrada no create
- [API] Balance auto-update em create/update/delete
- [TST] 15 testes CRUD + 4 testes categorização

---

## ✅ Fase 1: Core MVP — UI (Semanas 5-10) — COMPLETA

### Semana 5-6: Home + Contas

**Mobile:**
- [MOB] Tab bar 5 tabs: Início, Contas, Assistente, Transacções, Mais
- [MOB] Home: card saldo total, receitas/despesas, últimas 5 transacções, pull-to-refresh
- [MOB] Contas: lista com ícones/saldo, card resumo (activos/passivos/patrimônio)
- [MOB] Criar conta: bottom sheet (nome, tipo picker 7 tipos, instituição, saldo inicial)
- [MOB] Editar/eliminar conta: long-press → Alert com opções
- [MOB] Transferência: bottom sheet (origem, destino, valor, descrição)
- [MOB] Botão "Transferir" no header quando 2+ contas
- [MOB] API client (fetch + JWT auto-refresh + SecureStore)
- [MOB] Zustand stores (auth, accounts, transactions, categories, chat)

**Web:**
- [WEB] Layout 3 colunas: sidebar + main + chat panel
- [WEB] Dashboard (/): cards saldo/receitas/despesas, lista contas, transacções recentes
- [WEB] Contas (/accounts): cards resumo, lista com click-to-detail
- [WEB] Criar conta: Shadcn Dialog (nome, tipo Select, instituição, saldo)
- [WEB] Editar/eliminar conta: click conta → AccountDetailDialog (edit name/institution, delete)
- [WEB] Transferência: TransferDialog (Select origem/destino, valor, descrição)
- [WEB] API client (fetch + JWT auto-refresh + localStorage)
- [WEB] Format utils (formatKz, formatRelativeDate em pt-AO)

### Semana 7-8: Transacções

**Mobile:**
- [MOB] FAB (+) com haptic feedback no Home e Transacções
- [MOB] Criar transacção: bottom sheet (type toggle, AmountInput custom keypad, descrição, conta picker, categoria grid da API)
- [MOB] Lista transacções: agrupada por data com totais diários, infinite scroll
- [MOB] Filtros: chips tipo (Todas/Despesas/Receitas/Transf) + período (7d/Mês/3m/Ano/Tudo)
- [MOB] Swipe-to-delete: gesto + confirmação Alert + haptic
- [MOB] Detalhe transacção: /transaction/[id] com edit mode (valor + descrição) + delete
- [MOB] Tap numa transacção → navega para detalhe

**Web:**
- [WEB] Transacções (/transactions): vista agrupada + vista planilha/tabela (toggle)
- [WEB] Criar transacção: Dialog (type toggle, valor, descrição, conta Select, categoria Select) + atalho Ctrl+N
- [WEB] Filtros: chips tipo + período (matching mobile)
- [WEB] Tabela: colunas Data, Descrição, Tipo (badge), Valor (font-mono)
- [WEB] Click transacção → TransactionDetailDialog (ver, editar descrição/valor, eliminar)

### Semana 9: Dashboard/Relatórios

**Backend:**
- [API] GET /reports/spending-by-category (date_from, date_to)
- [API] GET /reports/income-expense-summary (date_from, date_to)

**Mobile:**
- [MOB] Reports tab: cards Receitas/Despesas/Balanço
- [MOB] Selector período (Este mês / 3 meses / Este ano)
- [MOB] Gastos por categoria: barras horizontais com %, valores, dots coloridos
- [MOB] Pull-to-refresh + empty state

**Web:**
- [WEB] Reports (/reports): cards summary com contagem transacções
- [WEB] Bar chart Receitas vs Despesas (Recharts)
- [WEB] Pie chart donut gastos por categoria (Recharts)
- [WEB] Lista breakdown com cores + percentagens
- [WEB] Selector período

### Testes Fase 1
- [TST] 60 backend tests (auth + CRUD + categorização + reports)
- [TST] 8 E2E Playwright (dashboard, accounts, transactions, filters, table, reports, pt-AO, dialog)

---

## ✅ Fase 2: Assistente IA (Semanas 11-16) — COMPLETA

### Semana 11: LLM Infrastructure
- [AI] LLMProvider abstracto (chat + tool calling interface)
- [AI] AnthropicProvider (Claude Haiku/Sonnet)
- [AI] OpenAIProvider (GPT-4o/mini)
- [AI] MockLLMProvider (respostas determinísticas para dev/test)
- [AI] LLMRouter (9 task types, fallback chain, auto-discover providers)
- [AI] Factory (create_llm_router, create_mock_router)
- [TST] 17 testes (mock responses, routing, tool calling, fallback, errors)

### Semana 12: Agents + Tools
- [AI] BaseAgent (tool call loop, confirm_before_execute, context injection)
- [AI] RouterAgent (10 intents: TRACKER, BUDGET, ADVISOR, GOALS, FAMILY, REPORT, DEBT, INVESTMENT, NEWS, GENERAL)
- [AI] TrackerAgent (tools: add_transaction, get_balance, get_transactions, search_transactions)
- [AI] ChatOrchestrator (route → agent → response, session + facts injection)
- [API] POST /api/v1/chat/message (autenticado, quota check, cache)
- [TST] 11 testes (routing intents, chat endpoint, auth, validation)

### Semana 13: Chat UI

**Mobile:**
- [MOB] Tab Assistente (posição central): chat screen completo
- [MOB] Message bubbles (user dark, assistant light) com agent label
- [MOB] Quick actions no empty state (Quanto tenho?, Últimas transacções, Gastos)
- [MOB] Input com send button + haptic + multiline + max 2000 chars
- [MOB] Typing indicator ("A pensar...")
- [MOB] Clear chat button no header
- [MOB] Chat store (Zustand): send message, history, session management

**Web:**
- [WEB] ChatPanel: painel lateral permanente no desktop (lg:w-80 xl:w-96)
- [WEB] Message bubbles com agent labels
- [WEB] Quick actions no empty state
- [WEB] Form input + Enter para enviar
- [WEB] Clear chat, loading indicator
- [WEB] Responsive: hidden em mobile/tablet, visible em desktop

### Semana 14: Advisor Agent
- [AI] AdvisorAgent (prompt Angola, dados reais, tom directo)
- [AI] Tool: get_spending (gastos por categoria num período)
- [AI] Tool: get_cashflow (receitas vs despesas + taxa poupança)
- [AI] Tool: get_balance (saldo total + por conta)
- [AI] Tool: can_afford (calcula impacto real no saldo vs despesas mensais)

### Semana 15: Memória
- [AI] Session memory Redis (24h TTL, 20 msgs, graceful degradation)
- [AI] Fact memory PostgreSQL (via preferences JSONB)
- [AI] MemoryExtractor (regex: salary_day, children, bank, rent, employer)
- [AI] Factos injectados no system prompt de cada agent
- [AI] Extracção async após cada mensagem

### Semana 16: Cache + Metering
- [AI] Cache L1 Redis (exact match, 1h TTL)
- [AI] Cache L3 Redis (dados computados, 5min TTL)
- [AI] Token metering diário por user em Redis
- [AI] Quotas por plano (free=5K, personal=50K, family=80K, family+=150K tokens/dia)
- [API] 429 quando quota excedida (mensagem pt-AO)
- [AI] AI categorization service + feedback loop
- [TST] 8 testes (plan limits, memory patterns)

**Total testes Phase 2: 96 backend + 8 E2E (de Phase 1)**

---

## Fase 3: Orçamento + Metas (Semanas 17-22) — ~90h

### Semana 17-18: Orçamento

**Backend:**
- [API] Tabelas budgets + budget_items (Alembic migration)
- [API] CRUD /budgets (GET/POST/PUT/DELETE) [BUD-01]
- [API] GET /budgets/{id}/status (gasto actual vs limite por item)
- [API] 5 métodos de orçamento: category, fifty_thirty_twenty, envelope, flex, zero_based
- [API] Rollover: transferir remanescente para próximo período [BUD-06]
- [API] GET /budgets/suggested (IA sugere com base em 3 meses histórico) [BUD-02]
- [TST] Testes CRUD orçamento (criar, listar, status, rollover, limites)

**Mobile:**
- [MOB] Ecrã orçamento (nova tab ou dentro de Mais): lista orçamentos activos
- [MOB] Criar orçamento: bottom sheet (nome, método, período, categorias com limites)
- [MOB] Barras de progresso por categoria (verde <70%, amarelo 70-90%, vermelho >90%)
- [MOB] Percentagem consumida + valor restante + dias restantes
- [MOB] Detalhe orçamento: tap para ver breakdown completo
- [MOB] Editar orçamento: alterar limites por categoria
- [MOB] Eliminar orçamento: swipe ou detalhe
- [MOB] Alerta visual quando >70%, >90%, >100%
- [MOB] Comparação orçado vs realizado por categoria

**Web:**
- [WEB] Orçamento (/budget): lista orçamentos com barras de progresso
- [WEB] Criar orçamento: Dialog (método, período, categorias, limites)
- [WEB] Detalhe: click → dialog/página com breakdown completo
- [WEB] Barras de progresso coloridas (matching mobile)
- [WEB] Editar/eliminar orçamento via dialog
- [WEB] Comparação orçado vs realizado (tabela ou gráfico barras)

### Semana 19: Budget Agent
- [AI] BudgetAgent (prompt + tools)
- [AI] Tool: create_budget (criar via chat)
- [AI] Tool: check_budget (quanto resta em cada categoria)
- [AI] Tool: suggest_budget (IA analisa 3 meses e sugere limites)
- [AI] Registar BudgetAgent no orchestrator
- [TST] Testes agent + tools

### Semana 20-21: Metas

**Backend:**
- [API] Tabelas goals + goal_contributions (Alembic migration)
- [API] CRUD /goals (GET/POST/PUT/DELETE) [GOL-01]
- [API] POST /goals/{id}/contribute (contribuição manual) [GOL-05]
- [API] GET /goals/{id}/progress (progresso + projecção de conclusão)
- [API] Cálculo contribuição mensal necessária [GOL-03]
- [API] Fundo de emergência (auto-cálculo 3-6 meses despesas) [GOL-08]
- [TST] Testes CRUD metas + contribuições + projecções

**Mobile:**
- [MOB] Ecrã metas: lista com barras progresso visual (0-100%)
- [MOB] Criar meta: bottom sheet (nome, tipo, valor alvo, data limite, contribuição mensal)
- [MOB] Detalhe meta: progresso visual, histórico contribuições, projecção conclusão
- [MOB] Contribuir: botão no detalhe → input valor → confirmar
- [MOB] Marcos (25%, 50%, 75%, 100%) com celebração (confetti/haptic)
- [MOB] Editar/eliminar meta
- [MOB] Fundo emergência: card especial com cálculo automático

**Web:**
- [WEB] Metas (/goals): lista com barras de progresso
- [WEB] Criar meta: Dialog (nome, tipo, valor, data, contribuição)
- [WEB] Detalhe: click → dialog com progresso, histórico, projecção
- [WEB] Contribuir: botão no dialog → input valor
- [WEB] Editar/eliminar via dialog
- [WEB] Fundo emergência: card com cálculo

### Semana 21: Goals Agent
- [AI] GoalsAgent (prompt + tools)
- [AI] Tool: create_goal
- [AI] Tool: get_goal_progress
- [AI] Tool: simulate_goal (e se poupar X/mês? quanto tempo?)
- [AI] Registar GoalsAgent no orchestrator
- [TST] Testes agent + tools

### Semana 22: Polish + Integração
- [API] Orçamento sugerido por IA (endpoint completo) [BUD-02]
- [AI] Simulação de metas via chat [GOL-11]
- [API] Ajuste automático de meta quando contribuição muda [GOL-14]
- [TST] Integration tests (orçamento ↔ transacções, metas ↔ contribuições)
- [TST] E2E Playwright: criar orçamento, ver progresso, criar meta, contribuir
- Bug fixes verificados com protocolo validação

---

## Fase 4: Família (Semanas 23-28) — ~100h

### Semana 23-24: Modelo Familiar

**Backend:**
- [API] Tabelas families, family_members, family_invites (Alembic migration)
- [API] Adicionar FK family_id em accounts (migration separada)
- [API] CRUD /families (GET/POST/PUT/DELETE) [FAM-01]
- [API] POST /families/invite (enviar convite por telefone/código) [FAM-02]
- [API] POST /families/invite/accept (aceitar convite)
- [API] PUT /families/members/{id}/role (alterar papel) [FAM-03]
- [API] DELETE /families/members/{id} (remover membro)
- [TST] Testes família (CRUD, convites, papéis, permissões)

**Mobile:**
- [MOB] Ecrã Família (dentro de Mais → Família): membros + resumo
- [MOB] Criar família: bottom sheet (nome)
- [MOB] Convidar membro: bottom sheet (telefone ou partilhar código)
- [MOB] Lista membros: nome, papel, contribuição
- [MOB] Alterar papel: tap membro → Alert opções (admin/adult/dependent)
- [MOB] Remover membro: swipe ou long-press

**Web:**
- [WEB] Família (/family): lista membros, resumo, convites pendentes
- [WEB] Criar família: Dialog (nome)
- [WEB] Convidar: Dialog (telefone ou copiar código)
- [WEB] Gestão membros: click → dialog (alterar papel, remover)

### Semana 25: Contas e Contribuições

**Backend:**
- [API] PUT /accounts/{id} → is_shared, family_id [FAM-04]
- [API] GET /families/{id}/contributions (tracking por membro) [FAM-08]
- [API] Modelos contribuição: equal, percentage, fixed, proportional [FAM-07]
- [API] Privacidade: filtrar contas individuais de outros membros [FAM-05]
- [TST] Testes contas partilhadas + privacidade + contribuições

**Mobile:**
- [MOB] Toggle partilhar conta: switch no detalhe da conta
- [MOB] Dashboard contribuições: quem contribuiu quanto este mês
- [MOB] Modelo contribuição: configuração no ecrã família
- [MOB] Contas individuais marcadas com cadeado (privadas)

**Web:**
- [WEB] Toggle partilhar conta no AccountDetailDialog
- [WEB] Dashboard contribuições na página Família
- [WEB] Configuração modelo contribuição
- [WEB] Indicador visual contas privadas vs partilhadas

### Semana 26: Orçamento e Gastos Familiares

**Backend:**
- [API] POST /budgets com family_id (orçamento doméstico separado) [FAM-06]
- [API] GET /families/{id}/spending (gastos por membro) [FAM-09]
- [API] GET /families/{id}/children/{id}/spending (gastos por filho) [FAM-09]
- [API] Eventos familiares (aniversários, regresso às aulas) [FAM-11]
- [TST] Testes orçamento familiar + gastos por membro + por filho

**Mobile:**
- [MOB] Toggle pessoal/família no orçamento e transacções
- [MOB] Orçamento doméstico: criar com family_id
- [MOB] Gastos por filho: lista de dependentes com totais (propina, uniforme, etc.)
- [MOB] Eventos familiares: calendário/lista com gastos associados

**Web:**
- [WEB] Toggle pessoal/família nas páginas de orçamento e transacções
- [WEB] Orçamento doméstico no /budget
- [WEB] Gastos por filho na página Família
- [WEB] Eventos familiares com tabela

### Semana 27: Family Agent
- [AI] FamilyAgent (prompt + tools)
- [AI] Tool: get_family_summary
- [AI] Tool: get_child_spending (por dependente)
- [AI] Tool: get_member_contributions
- [AI] Registar FamilyAgent no orchestrator
- [API] GET /families/{id}/report (relatório familiar mensal) [FAM-13]

**Mobile:**
- [MOB] Dashboard familiar: card resumo, contribuições, gastos por categoria familiar

**Web:**
- [WEB] Dashboard familiar na página /family com gráficos
- [WEB] Relatório familiar exportável

### Semana 28: Privacidade e Review

**Backend:**
- [API] needs_review flag em transacções (parceiro revê) [FAM-15]
- [API] is_private flag (esconder da família) [FAM-16]
- [API] Permissões granulares por membro [FAM-17]
- [API] Metas familiares: goals com family_id [FAM-12, GOL-09]
- [API] Notificações familiares [FAM-20]
- [TST] Testes privacidade (A não vê dados de B, review flow, permissões)

**Mobile:**
- [MOB] Switch "Necessita revisão" ao criar transacção
- [MOB] Switch "Privada" ao criar transacção
- [MOB] Lista transacções pendentes de revisão (para parceiro)
- [MOB] Metas familiares com contribuição por membro

**Web:**
- [WEB] Toggles revisão/privada no CreateTransactionDialog
- [WEB] Painel de transacções pendentes de revisão
- [WEB] Metas familiares no /goals

- [TST] E2E Playwright: criar família, convidar, contas partilhadas, privacidade

---

## Fase 5: IA Avançada (Semanas 29-34) — ~100h

### Semana 29: OCR de Recibos

**Backend:**
- [API] POST /chat/image (upload imagem base64)
- [API] Pré-processamento imagem (resize, optimizar)
- [API] Prompt multimodal (GPT-4o/Sonnet) para extrair: comerciante, data, itens, total
- [API] Validação (total = soma itens?)
- [TST] Testes OCR com imagens de recibos angolanos

**Mobile:**
- [MOB] Botão câmara no chat input + no FAB (long-press)
- [MOB] Captura foto com expo-camera
- [MOB] Preview dados extraídos → confirmar → criar transacção
- [MOB] Loading state durante processamento OCR

**Web:**
- [WEB] Botão upload foto no chat panel
- [WEB] Input file para upload de foto de recibo
- [WEB] Preview dados extraídos → confirmar → criar transacção

### Semana 30: Import de Extractos

**Backend:**
- [API] POST /accounts/import (upload CSV/PDF)
- [API] Parser CSV multi-banco (BAI, BFA, BIC) [ACC-06]
- [API] Parser PDF via multimodal (GPT-4o) [ACC-07]
- [API] Detecção duplicados [TXN-12]
- [API] Categorização batch das transacções importadas
- [TST] Testes import com extractos reais (CSV + PDF)

**Mobile:**
- [MOB] Botão importar no ecrã de contas
- [MOB] Picker de ficheiro (DocumentPicker)
- [MOB] Preview transacções detectadas → seleccionar/desseleccionar → confirmar import
- [MOB] Indicador de duplicados detectados

**Web:**
- [WEB] Botão importar na página /accounts
- [WEB] Drop zone ou file input para CSV/PDF
- [WEB] Tabela preview com checkbox para cada transacção
- [WEB] Indicador de duplicados + categorias sugeridas

### Semana 31: Smart Insights Engine

**Backend:**
- [API] Cron job análise diária (FastAPI background task ou Celery)
- [API] 6 regras de insight:
  - Gasto incomum (>3x média categoria 30d)
  - Orçamento em risco (>80% e >5 dias restantes)
  - Previsão saldo negativo (projecção até dia salário)
  - Padrão sazonal (mês actual >20% vs anterior)
  - Oportunidade poupança (surplus >threshold 3 meses)
  - Recorrência detectada (transacção similar 3+ meses) [TXN-08]
- [API] Formulação mensagens LLM (batch, Haiku)
- [API] Filtro relevância (max 2 insights/dia por user)
- [API] GET /insights (últimos insights do user)
- [TST] Testes para cada regra de insight

**Mobile:**
- [MOB] Card insight no Home screen (máx 1 visível)
- [MOB] Lista insights no ecrã de notificações
- [MOB] Tap insight → acção (ver orçamento, ver transacções, etc.)

**Web:**
- [WEB] Card insight no dashboard
- [WEB] Lista insights numa secção dedicada ou sidebar

### Semana 32: Notificações

**Backend:**
- [API] Tabelas notifications + notification_preferences + push_tokens (migration)
- [API] CRUD /notifications (GET, mark_read)
- [API] PUT /notifications/preferences (por tipo de notificação)
- [API] Expo Push setup (FCM/APNS)
- [API] Push: alertas orçamento, insights, resumo semanal, factura próxima, meta atingida
- [TST] Testes notificações (criar, marcar lida, preferências)

**Mobile:**
- [MOB] Centro de notificações: lista com read/unread
- [MOB] Badge no tab (número não lidas)
- [MOB] Preferências de notificação: toggles por tipo
- [MOB] Quiet hours (horário silêncio)
- [MOB] Push notifications via expo-notifications
- [MOB] Tap notificação → deep link para ecrã relevante

**Web:**
- [WEB] Ícone sino no header com dropdown de notificações
- [WEB] Lista notificações com mark-as-read
- [WEB] Preferências em /settings

### Semana 33: Memória Semântica

**Backend:**
- [API] Tabela user_embeddings + pgvector HNSW index (migration)
- [API] Geração embeddings por conversa (text-embedding-3-small)
- [API] Pesquisa semântica transacções [TXN-10]
- [API] Busca semântica no chat ("da última vez que falámos sobre...")
- [API] Cache L2 (respostas semânticas similares, cosine >0.95, 24h TTL)
- [TST] Testes embedding + pesquisa semântica

### Semana 34: Voz e Personalidade

**Backend:**
- [API] POST /chat/voice (upload áudio → Whisper → texto → chat normal)
- [API] Personalidade configurável: tom (balanced/casual/formal/coach), proactividade, detalhe [CFG-05]
- [API] Personalidade injectada no system prompt
- [TST] Testes voz (mock Whisper) + personalidade

**Mobile:**
- [MOB] Botão microfone no chat input
- [MOB] Gravação áudio com expo-av
- [MOB] Indicador visual "a ouvir..." durante gravação
- [MOB] Transcrição aparece como mensagem normal

**Web:**
- [WEB] Voz não prioritário (conforme tabela paridade)

**Mobile + Web:**
- [MOB] Configurações → Personalidade IA (3 sliders: tom, proactividade, detalhe)
- [WEB] /settings → Personalidade IA (matching mobile)

- [TST] E2E Playwright: insights no dashboard, notificações, configurações personalidade

---

## Fase 6: Monetização e Lançamento (Semanas 35-40) — ~80h

### Semana 35-36: Billing

**Backend:**
- [API] Tabela subscriptions (migration)
- [API] Integração Stripe (webhooks, checkout session)
- [API] POST /billing/checkout (criar sessão Stripe)
- [API] POST /billing/webhook (processar eventos Stripe)
- [API] GET /billing/subscription (estado actual)
- [API] Lógica planos (free → personal → family → family+)
- [API] Quotas enforced por plano (transacções, AI questions, membros família)
- [TST] Testes billing (mock Stripe)

**Mobile:**
- [MOB] Ecrã subscrição: plano actual, features, preços
- [MOB] Botão upgrade → Stripe checkout (in-app browser)
- [MOB] Indicador de quota (X/50 transacções este mês)
- [MOB] Bloqueio gracioso quando quota excedida

**Web:**
- [WEB] Página /settings/billing: plano actual, features, upgrade
- [WEB] Stripe checkout redirect
- [WEB] Indicador quota no dashboard

### Semana 37: Onboarding

**Backend:**
- [API] Flow onboarding (chat-based com steps) [CFG-14]
- [API] PUT /users/onboarding (marcar steps completos)
- [TST] Testes onboarding flow

**Mobile:**
- [MOB] Ecrã onboarding: welcome → registo → moeda/país → dia salário → primeira conta → saldo → demo
- [MOB] Chat-based: assistente guia passo-a-passo
- [MOB] Demo interactiva: registar despesa, fazer pergunta

**Web:**
- [WEB] Onboarding wizard: mesmos steps adaptados ao desktop
- [WEB] Chat no painel lateral guia o processo

### Semana 38: Marketing + Stores
- [WEB] Landing page pública (Next.js): hero, features, preços, download links
- [MOB] App Store listing + screenshots + descrição pt-AO
- [MOB] Play Store listing + screenshots + descrição pt-AO
- [MOB] EAS Build produção (iOS + Android)
- [MOB] Submissão stores

### Semana 39: Relatórios Avançados + Export

**Backend:**
- [AI] ReportAgent (prompt + tools)
- [AI] Tool: generate_report (relatório mensal em linguagem natural) [RPT-02]
- [API] GET /reports/export/pdf (gerar PDF) [RPT-12]
- [API] GET /reports/financial-score (score 0-100) [RPT-10]
- [API] Registar ReportAgent no orchestrator
- [TST] Testes relatórios + export

**Mobile:**
- [MOB] Relatório mensal IA: card com resumo em linguagem natural
- [MOB] Botão "Gerar relatório" → IA formula texto
- [MOB] Export PDF → partilhar (WhatsApp, email) [RPT-13]
- [MOB] Score financeiro: card visual (0-100, cor por nível)
- [MOB] Relatório familiar [RPT-03]

**Web:**
- [WEB] Relatório mensal IA na /reports
- [WEB] Botão gerar + download PDF
- [WEB] Score financeiro com gráfico
- [WEB] Relatório familiar

### Semana 40: Lançamento
- Sentry + PostHog setup (ambas plataformas)
- Monitoring dashboards
- Bug fixes finais (lista de issues)
- Performance optimisation (Lighthouse web, profiler mobile)
- Railway: merge staging → main (deploy produção)
- **LANÇAMENTO PÚBLICO**

---

## Fase 7: Expansão (Semanas 41-56) — ~110h

### Semanas 41-44: Dívidas (~25h)

**Backend:**
- [API] Tabelas debts + debt_payments (migration)
- [API] CRUD /debts (GET/POST/PUT/DELETE) [DEB-01 a DEB-06]
- [API] GET /debts/{id}/amortization (plano amortização) [DEB-03]
- [API] POST /debts/{id}/payment (registar pagamento)
- [API] GET /debts/simulate (simulação aceleração) [DEB-08]
- [API] Dívidas informais (amigo/família) [DEB-04]
- [AI] DebtAgent + tools (simulate, suggest strategy avalanche/snowball) [DEB-07]
- [TST] Testes dívidas + simulações

**Mobile:**
- [MOB] Ecrã dívidas (Mais → Dívidas): lista com saldo restante
- [MOB] Criar dívida: bottom sheet (nome, tipo, valor, taxa juros, prestação, credor)
- [MOB] Detalhe: plano amortização visual, histórico pagamentos
- [MOB] Registar pagamento: botão no detalhe
- [MOB] Simulador: "e se pagar X/mês a mais?"
- [MOB] Debt-free date projecção [DEB-10]
- [MOB] Rácio dívida/rendimento [DEB-11]
- [MOB] Editar/eliminar dívida

**Web:**
- [WEB] Dívidas (/debts): lista com saldo, taxa, prestação
- [WEB] Criar dívida: Dialog
- [WEB] Detalhe: click → dialog com plano amortização (tabela)
- [WEB] Simulador: form com sliders
- [WEB] Registar pagamento via dialog
- [WEB] Editar/eliminar

### Semanas 45-48: Investimentos (~20h)

**Backend:**
- [API] Tabela investments (migration)
- [API] CRUD /investments [INV-01]
- [API] GET /investments/performance (rendimento por investimento) [INV-02]
- [API] GET /investments/simulate (juros compostos) [INV-03]
- [AI] InvestmentAgent + tools
- [API] Contexto angolano: OTs BNA, certificados aforro [INV-06]
- [TST] Testes investimentos + simulador

**Mobile:**
- [MOB] Ecrã investimentos (Mais → Investimentos): lista com valor actual
- [MOB] Criar investimento: bottom sheet (nome, tipo, instituição, valor, taxa, maturidade)
- [MOB] Detalhe: rendimento, projecção, maturidade
- [MOB] Simulador juros compostos
- [MOB] Distribuição por tipo (gráfico)
- [MOB] Editar/eliminar

**Web:**
- [WEB] Investimentos (/investments): lista + performance
- [WEB] Criar/editar via Dialog
- [WEB] Simulador com gráfico de projecção (Recharts)
- [WEB] Distribuição por tipo (pie chart)

### Semanas 49-52: Notícias (~15h)

**Backend:**
- [API] Scraper/RSS fontes angolanas [NEW-01, NEW-02]
- [API] GET /news (feed curado)
- [API] Câmbio Kz/USD/EUR (BNA + paralelo) [NEW-04]
- [AI] NewsAgent + tools (resumo IA, análise personalizada) [NEW-06, NEW-07]
- [TST] Testes scraper + câmbio

**Mobile:**
- [MOB] Feed notícias: lista com thumbnails e resumo IA
- [MOB] Câmbio: card com taxas actuais (BNA)
- [MOB] "Como me afecta?": tap → análise personalizada via chat

**Web:**
- [WEB] Notícias (/news): feed com resumos
- [WEB] Widget câmbio no dashboard
- [WEB] Análise personalizada no chat panel

### Semanas 53-56: Educação e Gamificação (~18h)

**Backend:**
- [API] Dicas diárias personalizadas [EDU-01]
- [API] Desafios semanais [EDU-02]
- [API] Mini-cursos (conteúdo markdown) [EDU-03]
- [API] Badges, XP, levels [EDU-06]
- [API] Streaks (dias consecutivos registando) [EDU-07]
- [API] Leaderboard familiar [EDU-08]
- [TST] Testes gamificação

**Mobile:**
- [MOB] Card dica diária no Home
- [MOB] Ecrã desafios (Mais → Desafios): lista com progresso
- [MOB] Mini-cursos: lista → conteúdo markdown renderizado
- [MOB] Perfil: badges, XP, level, streaks
- [MOB] Leaderboard familiar

**Web:**
- [WEB] Dica diária no dashboard
- [WEB] Desafios e mini-cursos em /education
- [WEB] Perfil com badges e stats
- [WEB] Leaderboard familiar na /family

---

*Última actualização: 2026-03-29 v3.0*
