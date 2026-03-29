# O Financeiro — Roadmap de Desenvolvimento (Granular)

**Versao:** 2.0 | **Data:** 2026-03-28

Cada funcionalidade referencia o ID do documento `02_MODULOS_FUNCIONALIDADES.md`.
Estimativa total: ~670h ate lancamento (40 semanas) + ~110h expansao.

---

## Fase 0: Fundacao (Semanas 1-4) — ~80h

### Semana 1: Setup de Projecto
- Monorepo Turborepo (apps/web, apps/mobile, apps/api) — 2h
- Docker Compose: PostgreSQL 16 (pgvector) + Redis 7 — 1h
- FastAPI skeleton (main, config, deps, router) — 3h
- Next.js 15 skeleton (Tailwind + Shadcn + Zustand) — 2h
- Expo skeleton (React Native + navegacao) — 2h
- Alembic init + ESLint/Prettier — 2h

### Semana 2: Modelo de Dados Core
- Enums SQL (account_type, transaction_type, etc.) — 1h
- Tabela users + model + schema — 2h
- Tabela accounts + model + schema — 2h
- Tabela categories + model + schema — 1.5h
- Tabela transactions + model + schema + indices — 3h
- Seed data: 60+ categorias Angola — 1h
- Trigger update_account_balance + views — 2h
- Migracao Alembic + testes — 2.5h

### Semana 3: Auth
- POST /auth/register (telefone + email) — 3h
- POST /auth/login (password + OTP) — 2h
- OTP via SMS (Twilio) — 2h
- JWT (access + refresh) + middleware — 3h
- Rate limiting + testes — 3h

### Semana 4: CRUD Core
- CRUD /accounts (GET/POST/PUT/DELETE) — 3h [ACC-01]
- GET /accounts/summary (saldo consolidado) — 1h [ACC-03]
- POST /accounts/transfer — 2h [ACC-08]
- CRUD /transactions (GET/POST/PUT/DELETE) — 4h [TXN-04]
- GET /transactions com filtros — 2h [TXN-11]
- Categorizacao por regras (sem IA) — 1h [TXN-06 parcial]
- Testes — 3h

---

## Fase 1: Core MVP — UI (Semanas 5-10) — ~100h

### Semana 5-6: Mobile Home + Contas
- Tab bar + navegacao principal — 3h
- Home: saldo total, receitas/despesas — 4h
- Home: ultimas 5 transaccoes — 2h
- Lista de contas com saldo — 3h [ACC-01, ACC-03]
- Criar conta (formulario) — 2h [ACC-01]
- API client (axios + JWT interceptors) — 2h
- Zustand stores (accounts, transactions) — 2h
- Pull to refresh — 1h

### Semana 7-8: Mobile Transaccoes
- FAB (+) com bottom sheet — 2h
- Formulario registar transaccao — 4h [TXN-04]
- Teclado numerico optimizado — 1h
- Grid de categorias (icones, frequentes) — 2h
- Lista de transaccoes (agrupada por dia) — 4h
- Vista estilo planilha — 3h [RPT-14]
- Swipe actions (editar, eliminar) — 2h
- Filtros (data, categoria, conta) — 2h [TXN-11]
- Detalhe de transaccao — 2h

### Semana 9: Dashboard Basico
- Grafico circular: gastos por categoria — 3h [RPT-04]
- Selector de periodo — 1h
- Card receitas vs despesas — 2h [RPT-07]
- Net worth — 1h [RPT-08, ACC-12]

### Semana 10: Web Mirror
- Layout responsivo (sidebar + main + panel) — 3h
- Home/Dashboard web — 3h
- Lista de contas web — 2h
- Lista de transaccoes web — 3h
- Formulario de transaccao web — 2h
- Design system Shadcn — 3h

---

## Fase 2: Assistente IA (Semanas 11-16) — ~120h

### Semana 11: LLM Infrastructure
- LLMProvider abstracto — 2h
- AnthropicProvider (Claude) — 2h
- OpenAIProvider (GPT-4o) — 2h
- LLMRouter (seleccao por tarefa + fallback) — 3h
- Config modelos por tarefa — 1h
- Testes com mocks — 2h

### Semana 12: Router + Tracker Agent
- RouterAgent (classificacao de intent) — 3h
- BaseAgent (skills, tools, memoria) — 2h
- TrackerAgent (system prompt + skills) — 3h
- Tool: add_transaction — 2h [TXN-01]
- Tool: get_transactions — 1.5h
- Tool: get_balance — 1h
- Tool: search_transactions — 1.5h [TXN-10 parcial]
- Tool registry + dispatcher — 2h
- POST /chat/message endpoint — 2h
- Testes agent + tool — 3h

### Semana 13: UI Chat
- Ecra Chat mobile (mensagens, input) — 4h
- Streaming de resposta (SSE) — 3h
- Botoes de confirmacao inline — 2h
- Quick actions — 2h
- Chat web (painel lateral) — 3h
- Historico de conversas — 2h

### Semana 14: Advisor Agent
- AdvisorAgent (prompt + skills) — 3h
- Skill: spending_analysis.md — 1h
- Skill: angolan_context.md — 2h
- Tool: get_spending — 2h
- Tool: get_cashflow — 1.5h
- Fluxo "posso comprar X?" — 3h
- Testes — 2h

### Semana 15: Memoria
- Memoria de sessao Redis — 2h
- Tabela user_facts + CRUD — 2h
- MemoryExtractor (async pos-conversa) — 4h
- Injeccao de factos no system prompt — 2h
- Factos do onboarding — 1h
- Testes — 2h

### Semana 16: Categorizacao IA + Cache
- Categorizacao por LLM — 3h [TXN-06]
- Feedback loop (correccoes) — 2h [TXN-07]
- Cache L1 (respostas exactas, Redis) — 2h
- Cache L3 (dados computados) — 2h
- Metering tokens por utilizador — 1.5h
- Quotas plano gratuito — 1.5h

---

## Fase 3: Orcamento + Metas (Semanas 17-22) — ~90h

### Semana 17-18: Orcamento
- Tabelas budgets + budget_items — 2h
- CRUD /budgets API — 3h [BUD-01]
- 5 metodos de orcamento (logica) — 4h
- UI mobile: barras de progresso — 4h [BUD-04]
- UI mobile: criar orcamento — 3h [BUD-01]
- Tracking tempo real — 2h [BUD-04]
- Alertas 70/90/100% — 2h [BUD-05]
- Rollover — 2h [BUD-06]
- Comparacao orcado vs realizado — 2h [BUD-07]
- Web mirror — 3h

### Semana 19: Budget Agent
- BudgetAgent (prompt + skills) — 2h
- Tool: create_budget — 2h [BUD-11]
- Tool: check_budget — 2h [BUD-11]
- Orcamento sugerido por IA — 3h [BUD-02]
- Testes — 2h

### Semana 20: Metas
- Tabelas goals + goal_contributions — 2h
- CRUD /goals API — 3h [GOL-01]
- UI: lista com progresso visual — 3h [GOL-04]
- UI: criar meta — 2h [GOL-01]
- Calculo contribuicao mensal — 1h [GOL-03]
- Contribuicao manual — 1.5h [GOL-05]
- Multiplas metas — 1h [GOL-07]
- Fundo de emergencia — 2h [GOL-08]
- Marcos e celebracoes — 2h [GOL-12]

### Semana 21: Goals Agent
- GoalsAgent (prompt + skills) — 2h
- Tool: create_goal — 1.5h
- Tool: get_goal_progress — 1.5h
- Recomendacoes IA — 3h [GOL-10, GOL-11]
- Testes — 2h

### Semana 22: Polish
- Orcamento sugerido por IA — 2h [BUD-02]
- Simulacao de metas — 2h [GOL-11]
- Ajuste automatico de meta — 2h [GOL-14]
- Integration tests — 3h
- Bug fixes e polish — 3h

---

## Fase 4: Familia (Semanas 23-28) — ~100h

### Semana 23-24: Modelo Familiar
- Tabelas families, family_members, invites — 3h
- CRUD /families API — 3h [FAM-01]
- Sistema de convites — 4h [FAM-02]
- Papeis e permissoes — 3h [FAM-03]
- UI mobile: ecra familia + convites — 3h

### Semana 25: Contas e Contribuicoes
- Contas partilhadas — 2h [FAM-04]
- Contas individuais (privacidade) — 1.5h [FAM-05]
- Modelos de contribuicao — 3h [FAM-07]
- Tracking contribuicoes — 2h [FAM-08]
- UI dashboard contribuicoes — 2h

### Semana 26: Orcamento e Gastos Familiares
- Orcamento domestico — 3h [FAM-06]
- Gastos por filho — 2h [FAM-09]
- Categorias domesticas — 1h [FAM-10]
- Eventos familiares — 2h [FAM-11]
- Toggle pessoal/familia UI — 2h

### Semana 27: Family Agent
- FamilyAgent (prompt + skills) — 2h
- Tool: get_family_summary — 2h
- Tool: get_child_spending — 1.5h
- Relatorio familiar mensal — 3h [FAM-13]
- Dashboard familiar — 3h [FAM-14]

### Semana 28: Privacidade e Review
- Needs Review flag — 2h [FAM-15]
- Transaccoes privadas — 2h [FAM-16]
- Permissoes granulares — 3h [FAM-17]
- Metas familiares — 2h [FAM-12, GOL-09]
- Notificacoes familiares — 1.5h [FAM-20]
- Testes familia completa — 3h

---

## Fase 5: IA Avancada (Semanas 29-34) — ~100h

### Semana 29: OCR de Recibos
- POST /chat/image endpoint — 2h
- Pre-processamento imagem — 1h
- Prompt multimodal extracao recibo — 2h
- Preview dados + confirmacao — 3h [TXN-03]
- UI: botao camara no chat + FAB — 2h
- Testes com recibos angolanos — 2h

### Semana 30: Import de Extractos
- Parser CSV (multi-banco) — 4h [ACC-06]
- Parser PDF (multimodal GPT-4o) — 3h [ACC-06, ACC-07]
- Preview + seleccao — 3h
- Deteccao duplicados — 2h [TXN-12]
- Categorizacao batch — 1.5h
- Testes extractos BAI/BFA/BIC — 2h

### Semana 31: Smart Insights Engine
- Cron job analise diaria — 3h
- Regra: gasto incomum (3x media) — 1.5h
- Regra: orcamento em risco (>80%) — 1h
- Regra: previsao saldo negativo — 2h
- Regra: padrao sazonal — 1.5h
- Regra: oportunidade poupanca — 1.5h
- Regra: recorrencia detectada — 2h [TXN-08]
- Formulacao mensagens LLM (batch) — 2h
- Filtro relevancia (max 2/dia) — 1h

### Semana 32: Notificacoes
- Tabelas notifications + preferences + push_tokens — 2h
- Expo Push setup (FCM/APNS) — 3h
- Push: alertas orcamento — 1h
- Push: insights proactivos — 1h
- Push: resumo semanal — 2h
- Push: factura proxima — 1.5h
- Push: meta atingida — 1h
- Push: divida a vencer — 1h
- UI: centro notificacoes + preferencias — 3h [NTF-01 a NTF-05]

### Semana 33: Memoria Semantica
- Tabela user_embeddings + pgvector index — 2h
- Geracao embeddings por conversa — 2h
- Pesquisa semantica transaccoes — 3h [TXN-10]
- Busca semantica no chat — 2h
- Cache L2 (respostas similares) — 2h

### Semana 34: Voz e Personalidade
- Whisper API (speech-to-text) — 3h
- UI: botao voz no chat — 2h
- POST /chat/voice endpoint — 1.5h
- Personalidade configuravel — 2h [CFG-05]
- UI: configuracoes personalidade — 1.5h

---

## Fase 6: Monetizacao e Lancamento (Semanas 35-40) — ~80h

### Semana 35-36: Billing
- Tabela subscriptions — 1.5h
- Integracao Stripe — 6h
- Logica de planos (free/personal/family/family+) — 3h
- Quotas por plano — 2h
- UI: ecra subscracao — 3h [CFG-15]
- Testes billing — 2h

### Semana 37: Onboarding
- Flow onboarding assistido (chat-based) — 4h [CFG-14]
- Setup: moeda, pais, dia salario — 1h
- Setup: primeira conta e saldo — 1.5h
- Demo interactiva — 2h
- Testes onboarding — 1.5h

### Semana 38: Marketing e Stores
- Landing page (Next.js) — 8h
- App Store listing — 3h
- Play Store listing — 3h
- EAS Build producao — 2h
- Submissao stores — 2h

### Semana 39: Relatorios e Export
- ReportAgent (prompt + tools) — 3h
- Tool: generate_report — 3h [RPT-02]
- Export PDF — 3h [RPT-12]
- Partilha WhatsApp/email — 2h [RPT-13]
- Relatorio familiar — 2h [RPT-03]
- Score financeiro — 2h [RPT-10]

### Semana 40: Lancamento
- Bug fixes finais — 8h
- Performance optimization — 4h
- Sentry + PostHog setup — 2h
- Monitoring dashboards — 2h
- LANCAMENTO PUBLICO

---

## Fase 7: Expansao (Semanas 41-56) — ~110h

### Semanas 41-44: Dividas (~25h)
- Tabelas debts + debt_payments — 2h [DEB-01, DEB-02]
- CRUD /debts API + UI — 6h [DEB-01 a DEB-06]
- Plano amortizacao visual — 3h [DEB-03]
- Dividas informais — 2h [DEB-04]
- DebtAgent + tools — 4h [DEB-07, DEB-08]
- Simulacao aceleracao — 3h [DEB-08]
- Debt-free date — 2h [DEB-10]
- Racio divida/rendimento — 1h [DEB-11]

### Semanas 45-48: Investimentos (~20h)
- Tabela investments + CRUD — 4h [INV-01]
- UI: lista e detalhe — 4h [INV-01]
- Tracking rendimento — 2h [INV-02]
- Simulador juros compostos — 3h [INV-03]
- Distribuicao por tipo — 2h [INV-04]
- InvestmentAgent — 3h
- Contexto angolano (OTs, BNA) — 2h [INV-06]

### Semanas 49-52: Noticias (~15h)
- Scraper/RSS fontes angolanas — 4h [NEW-01, NEW-02]
- Feed curado com resumo IA — 3h [NEW-06]
- Cambio Kz/USD/EUR (BNA + paralelo) — 2h [NEW-04]
- NewsAgent — 3h
- Analise personalizada — 2h [NEW-07]

### Semanas 53-56: Educacao e Gamificacao (~18h)
- Dicas diarias personalizadas — 2h [EDU-01]
- Desafios semanais — 3h [EDU-02]
- Mini-cursos (conteudo markdown) — 4h [EDU-03]
- Badges e XP — 3h [EDU-06]
- Streaks — 2h [EDU-07]
- Leaderboard familiar — 2h [EDU-08]
- Simulador investimento interactivo — 2h [EDU-05]
