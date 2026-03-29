# O Financeiro — Project Specification

**A melhor app de gestão financeira pessoal e familiar com IA para Angola e PALOP.**

---

## Golden Rule

> A IA é o produto, não um add-on. Cada funcionalidade deve ser pensada primeiro como conversacional e depois como interface tradicional.

---

## Research-First Rule (MANDATORY)

Before ANY implementation, read the relevant documentation in `docs/`. Each module has a corresponding section in `docs/02_MODULOS_FUNCIONALIDADES.md`. AI architecture is in `docs/04_ARQUITECTURA_IA.md`. Data model is in `docs/05_MODELO_DADOS.md`. No exceptions — understand the spec before writing code.

---

## Architecture Overview

```
Clients (React Native 0.84+ / Next.js 16)
  → API Gateway (JWT + Rate Limiting)
    → FastAPI Backend (Python 3.13)
      → 9 Services + AI Engine (Multi-Agent)
    → PostgreSQL 17 + pgvector
    → Redis 8
    → External: LLMs, Whisper, BNA, FCM/APNS
```

See `diagramas/01_arquitectura_sistema.mermaid` for full diagram.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.84+ (New Architecture) + Expo SDK 55 |
| Web | Next.js 16 + Tailwind CSS v4 + Shadcn UI v4 + Zustand v5 |
| Backend | FastAPI 0.135+ (Python 3.13) |
| Database | PostgreSQL 17 + pgvector |
| Cache | Redis 8 |
| AI | Claude (Anthropic) + GPT-4o (OpenAI) + Gemini (Google) |
| Embeddings | text-embedding-3-small (OpenAI) |
| Speech | Whisper API |
| Auth | Supabase Auth or Auth.js (OTP via SMS) |
| Storage | Supabase Storage or S3-compatible |
| Hosting | Railway (backend + web) + EAS Build (mobile) |
| Monorepo | Turborepo |
| CI/CD | GitHub Actions |
| Monitoring | Sentry + PostHog |

---

## Monorepo Structure

```
o-financeiro/
├── apps/
│   ├── api/            # FastAPI backend (Python 3.13)
│   ├── web/            # Next.js 16 web app
│   └── mobile/         # React Native + Expo
├── packages/
│   ├── shared/         # Shared types, constants, utils (TypeScript)
│   └── ui/             # Shared UI components (React Native + Web)
├── docs/               # Product & technical documentation
├── diagramas/          # Mermaid architecture diagrams
├── infra/              # Docker Compose, deployment configs
├── scripts/            # Dev utilities, migrations, seeds
├── turbo.json
├── package.json
└── CLAUDE.md
```

---

## Code Standards

### Python (Backend — apps/api)
- Python 3.13+, modern type hints (`list[str]` not `List[str]`, `X | None` not `Optional[X]`)
- Ruff for linting and formatting
- pytest with minimum 80% coverage on core modules
- Pydantic v2.12+ for all schemas and validation
- async/await for all I/O operations
- SQLAlchemy 2.0 with async sessions (`mapped_column` style, not legacy `Column()`)
- Alembic for migrations
- All endpoints must validate input and return proper HTTP status codes
- Rate limiting on all public endpoints

### TypeScript (Web + Mobile)
- Strict mode, no `any` type
- Next.js 16 App Router (web) — async request APIs mandatory, Turbopack default, React 19
- Expo Router v4 (mobile) — Expo SDK 55, React Native New Architecture default
- Shadcn UI v4 + Tailwind CSS v4 (CSS-first config, `@theme` directive)
- Zustand v5 for state management
- TanStack React Query v5 for server state
- Vitest for testing

### General Rules
- All text visible to users must be in Portuguese (pt-AO variant)
- Currency amounts: always formatted with thousand separators and Kz suffix (e.g., "150.000 Kz")
- Numbers in UI: monospaced font (JetBrains Mono), right-aligned
- No UUIDs visible to users — use display names, slugs, or short codes
- Mobile-first: every screen designed for mobile, then adapted to web
- 5-second rule: any common action must be completable in under 5 seconds
- Offline-capable: core features must work without internet, sync when back online

### Mobile / Web Feature Parity

Both platforms must be 100% implemented. Web is NOT a "lite" version.

| Funcionalidade | Mobile | Web | Nota |
|---------------|--------|-----|------|
| Registo de transacções | Completo | Completo | Core em ambos |
| Chat com assistente | Completo | Painel lateral permanente | Desktop: chat + dashboard em simultâneo |
| Dashboard e relatórios | Completo | Completo (melhor) | Gráficos e tabelas brilham no desktop |
| Orçamento | Completo | Completo | Core em ambos |
| Família | Completo | Completo | Ecrã maior beneficia gestão familiar |
| Import de extractos | Upload | Upload (melhor) | Desktop mais natural para ficheiros |
| OCR de recibos | Completo (câmara) | Upload de foto apenas | Câmara é mobile |
| Input por voz | Completo (Whisper) | Não prioritário | Ninguém fala para o PC no escritório |
| Push notifications | Completo | Não aplicável | Push é mobile |
| Modo offline | Completo | Não prioritário | Desktop tem internet estável |
| Biometria | Completo | Não aplicável | Hardware mobile |
| Quick-add (FAB) | FAB | Atalho de teclado | Adaptado ao contexto |
| Estilo planilha | Disponível | Completo (melhor) | Planilha precisa de largura |

---

## AI Architecture

### Multi-Agent System (10 Agents)

| Agent | Module | Responsibility |
|-------|--------|---------------|
| Router | — | Intent classification, routes to correct agent |
| Tracker | FIN.TXN | Register & query transactions |
| Advisor | FIN.AI | Financial advice & analysis |
| Budget | FIN.BUD | Budget creation & tracking |
| Goals | FIN.GOL | Savings goals & recommendations |
| Family | FIN.FAM | Household finances |
| Report | FIN.RPT | Report generation |
| Debt | FIN.DEB | Debt management & simulation |
| Investment | FIN.INV | Investment tracking |
| News | FIN.NEW | Financial news & context |

See `diagramas/02_fluxo_multi_agente.mermaid` for full flow.

### Three-Layer Memory

1. **Session** (Redis, 24h TTL): last 20 messages, active agent, workflow state
2. **Facts** (PostgreSQL): explicit & inferred user facts (salary, children, patterns)
3. **Semantic** (pgvector): embeddings for pattern search and personalization

See `diagramas/03_sistema_memoria.mermaid` for details.

### LLM Strategy (Cost Optimization)

| Task | Model | Reason |
|------|-------|--------|
| Routing/Classification | Haiku / GPT-4o-mini | Fast, cheap |
| Conversation | Sonnet / GPT-4o | Quality/cost balance |
| Complex Analysis | Sonnet | Reasoning |
| Receipt OCR | GPT-4o / Sonnet | Multimodal |
| Batch Insights | Haiku | Low cost |

Target: $0.15-$0.50 per active user/month.

---

## Angola-Specific Context

These are NON-NEGOTIABLE product requirements:

- **Currency**: Kwanza (Kz) as default, multi-currency (USD, EUR) with BNA rates
- **Categories**: 60+ pre-configured for Angola (zungueira, candongueiro, EPAL, ENDE, Kixikila, propina escolar, empregada doméstica, etc.)
- **Cash economy**: dedicated cash account type, cash is primary for many users
- **Offline-first**: internet is unstable in Angola — core features must work offline
- **No bank API dependency**: manual entry + import + OCR (Plaid unavailable in Angola)
- **Family-centric**: not an add-on — family management is a core pillar from day 1
- **OTP auth**: SMS-based (phone numbers, not email, are the primary identifier)
- **Language**: Portuguese (Angola variant) — not Brazilian Portuguese

---

## Module Priority

| Priority | Modules | Phase |
|----------|---------|-------|
| P0 Core | FIN.AI, FIN.ACC, FIN.TXN, FIN.BUD, FIN.CFG | Phases 0-2 |
| P1 Launch | FIN.FAM, FIN.GOL, FIN.DEB, FIN.RPT, FIN.NTF | Phases 3-4 |
| P2 Expansion | FIN.INV, FIN.NEW, FIN.EDU | Phase 7 |

See `docs/07_ROADMAP.md` for full 40-week roadmap.

---

## Development Phases

| Phase | Weeks | Focus |
|-------|-------|-------|
| 0 | 1-4 | Foundation: monorepo, Docker, FastAPI, core data model, auth |
| 1 | 5-10 | Core MVP UI: mobile + web screens, transactions, accounts |
| 2 | 11-16 | AI Assistant: multi-agent, router, tracker, memory, chat UI |
| 3 | 17-22 | Budgets & Goals: methods, tracking, AI suggestions |
| 4 | 23-28 | Family: aggregates, shared accounts, per-child tracking |
| 5 | 29-34 | Advanced AI: OCR, import, insights engine, voice, notifications |
| 6 | 35-40 | Monetization & Launch: billing, onboarding, app stores |
| 7 | 41-56 | Expansion: debts, investments, news, education |

---

## Data Model

See `docs/05_MODELO_DADOS.md` and `diagramas/04_modelo_dados.mermaid` for full ERD.

Key tables: users, accounts, transactions, categories, budgets, budget_items, goals, debts, families, family_members, chat_messages, user_facts, notifications, recurring_patterns, investments, subscriptions, push_tokens.

Rules:
- UUIDs for all primary keys
- JSONB for flexible preferences/metadata
- pgvector for semantic search embeddings
- Row-Level Security (RLS) enforced
- Hierarchical categories (parent_id)
- All monetary values stored as integers (centavos) to avoid float precision issues

---

## Security

See `.claude/skills/clean-code-security.md` for full security standards and code quality rules.

- TLS 1.3 in transit, AES-256 at rest
- JWT with short-lived access tokens (15min) + httpOnly refresh tokens (7 days)
- Rate limiting: 100 req/min API, 20 msg/min chat, 5 OTP attempts/10min
- SQLAlchemy ORM only — NEVER raw SQL (prevents injection)
- Biometric/PIN on mobile for sensitive operations
- RLS in PostgreSQL as defense-in-depth
- PII redaction before sending to LLMs (names, phone numbers, account numbers)
- Pydantic/Zod validation on ALL input at API boundaries
- No hardcoded secrets — all via environment variables
- Financial data never sold or used for external training
- App is READ-ONLY: never moves money, never connects to bank accounts directly
- CORS restricted to known origins only
- Security headers: nosniff, DENY frame, HSTS, CSP

---

## Git & Branching Strategy

### Branches Permanentes
| Branch | Propósito | Railway |
|--------|-----------|---------|
| `dev` | Desenvolvimento activo | — (sem deploy) |
| `staging` | Testes antes de produção | api-staging.ofinanceiro.ao / app-staging.ofinanceiro.ao |
| `main` | Produção | api.ofinanceiro.ao / app.ofinanceiro.ao |

### Git Flow
```
feature branch (phase-0/infra/docker-setup)
  → criada a partir de dev
    → PR para dev (code review, merge features)
      → merge dev → staging (deploy automático staging, testar)
        → merge staging → main (deploy automático production)
```

### Feature Branches
- Naming: `phase-<n>/<module>/<description>` (e.g., `phase-0/infra/docker-setup`)
- Sempre criadas a partir de `dev`
- PR para `dev` primeiro (code review)
- Quando pronto para testar: merge `dev` → `staging`
- Quando testado: merge `staging` → `main`

## Implementation Strategy

Per-module, backend-first approach:

```
Módulo FIN.XXX:
  Feature 1:
    1. Backend: models, schemas, migrations
    2. Backend: endpoints + services
    3. Backend: testes (pytest)
  Feature 2:
    4. Backend: models, schemas, migrations
    5. Backend: endpoints + services
    6. Backend: testes (pytest)
  ... (repetir até backend do módulo completo)
  Frontend:
    7. Screens mobile + web (todas as features)
    8. Integração frontend ↔ API
    9. Testes E2E (Playwright) — ver skill feature-validation
  → Próximo módulo
```

**Regra**: Uma feature só é COMPLETA após passar o protocolo completo de validação E2E (`.claude/skills/feature-validation.md`). Nunca avançar para a próxima feature com problemas conhecidos.

---

## Workflow Rules

- NO `Co-Authored-By` trailers in commits — commits belong to Cussei only
- Mandatory doc review before implementing any module
- Conventional commits: `<type>(FIN.<MOD>): <description>`
  - Types: feat, fix, refactor, test, docs, chore, style, perf
  - Scopes: FIN.AI, FIN.ACC, FIN.TXN, FIN.BUD, FIN.FAM, FIN.GOL, FIN.DEB, FIN.RPT, FIN.NTF, FIN.INV, FIN.NEW, FIN.EDU, FIN.CFG, infra, docs
- All PRs must reference the phase and module being implemented
- Tests required before merging any feature

---

## Infrastructure

### Local Development
Docker Compose for data services only. App code runs natively for fast iteration.

```bash
docker compose up -d          # PostgreSQL + Redis only
cd apps/api && uvicorn app.main:app --reload   # API
cd apps/web && npm run dev                      # Web
cd apps/mobile && npx expo start                # Mobile
```

### Railway (Staging + Production)
All 4 services deployed per environment. See `railway-setup.sh`.

| Ambiente | Branch | Serviços |
|----------|--------|----------|
| staging | `staging` | ofinanceiro-api, ofinanceiro-web, PostgreSQL, Redis |
| production | `main` | ofinanceiro-api, ofinanceiro-web, PostgreSQL, Redis |

CI/CD: push to `staging` → auto-deploy staging. Push to `main` → auto-deploy production. `dev` não tem deploy.

---

## Key Metrics

**North Star**: Users registering transactions >= 3 days/week

**Business Targets (18 months)**:
- 80,000 downloads
- 40,000 MAU
- 3,000 paying subscribers
- $12,000 MRR
