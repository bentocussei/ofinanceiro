# O Financeiro — Arquitectura Técnica

**Versão:** 1.0
**Data:** 2026-03-28

---

## 1. Stack Tecnológico

### 1.1 Decisões e Justificações

| Decisão | Escolha | Alternativas Consideradas | Justificação |
|---|---|---|---|
| Frontend Web | Next.js 15 + Tailwind + Shadcn UI + Zustand | Remix, SvelteKit | SSR nativo, ecossistema React, Shadcn dá UI profissional rapidamente |
| Mobile | React Native + Expo SDK 52+ | Flutter, SwiftUI+Kotlin | Partilha ecossistema TS com web, Expo maduro, curva de aprendizagem mínima |
| Backend | FastAPI (Python 3.12) | NestJS, Django | Ecossistema IA imbatível, async nativo, experiência existente |
| Base de Dados | PostgreSQL 16 | MySQL, MongoDB | JSONB, pgvector (embeddings), RLS, maturidade |
| Cache | Redis 7 | Memcached | Pub/sub para notificações real-time, estruturas de dados ricas |
| Auth | Supabase Auth ou Auth.js | Firebase Auth, Clerk | Self-hosted possível, OTP por telefone, social login |
| Storage | Supabase Storage / S3 | Cloudinary | Custo baixo, integração directa |
| Hosting Backend | Railway / Render / Fly.io | AWS, GCP, Azure | Deploy simples para solo founder, escala quando necessário |
| Hosting Web | Vercel | Netlify, Cloudflare Pages | Integração nativa Next.js, edge functions |
| LLM | Multi-provider (Claude + GPT + Gemini) | Provider único | Flexibilidade, fallback, melhor modelo por tarefa |
| Monitorização | Sentry + PostHog | Datadog, Amplitude | Sentry para erros, PostHog para product analytics (ambos com free tier) |

### 1.2 Monorepo vs Multi-repo

**Decisão: Monorepo** com Turborepo

```
o-financeiro/
├── apps/
│   ├── web/              # Next.js 15
│   ├── mobile/           # React Native + Expo
│   └── api/              # FastAPI
├── packages/
│   ├── shared-types/     # TypeScript types partilhados (web + mobile)
│   ├── ui/               # Componentes UI partilhados (web + mobile via RN Web)
│   └── utils/            # Utilidades partilhadas
├── docs/                 # Documentação (estes ficheiros)
├── diagramas/            # Mermaid diagrams
├── turbo.json
├── package.json
└── README.md
```

**Nota:** O backend FastAPI é Python e não participa no Turborepo pipeline. Tem o seu próprio `pyproject.toml` e é deployed independentemente.

---

## 2. Backend API (FastAPI)

### 2.1 Estrutura do Projecto

```
apps/api/
├── app/
│   ├── main.py                    # FastAPI app + middleware
│   ├── config.py                  # Settings (Pydantic BaseSettings)
│   ├── deps.py                    # Dependency injection
│   │
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py            # Login, register, OTP
│   │   │   ├── accounts.py        # CRUD contas
│   │   │   ├── transactions.py    # CRUD transacções
│   │   │   ├── budgets.py         # CRUD orçamentos
│   │   │   ├── goals.py           # CRUD metas
│   │   │   ├── debts.py           # CRUD dívidas
│   │   │   ├── family.py          # Agregado familiar
│   │   │   ├── reports.py         # Relatórios e analytics
│   │   │   ├── chat.py            # Endpoint do assistente
│   │   │   ├── notifications.py   # Preferências de notificação
│   │   │   ├── investments.py     # Tracking investimentos
│   │   │   ├── news.py            # Feed de notícias
│   │   │   └── users.py           # Perfil e configurações
│   │   └── router.py              # Regista todas as rotas
│   │
│   ├── ai/
│   │   ├── router_agent.py        # Router Agent (classificação intent)
│   │   ├── agents/
│   │   │   ├── base.py            # BaseAgent class
│   │   │   ├── tracker.py         # Tracker Agent
│   │   │   ├── advisor.py         # Advisor Agent
│   │   │   ├── budget.py          # Budget Agent
│   │   │   ├── family.py          # Family Agent
│   │   │   ├── goals.py           # Goals Agent
│   │   │   ├── report.py          # Report Agent
│   │   │   ├── debt.py            # Debt Agent
│   │   │   ├── investment.py      # Investment Agent
│   │   │   └── news.py            # News Agent
│   │   ├── tools/
│   │   │   ├── registry.py        # Tool registry + dispatcher
│   │   │   ├── transaction_tools.py
│   │   │   ├── account_tools.py
│   │   │   ├── budget_tools.py
│   │   │   ├── goal_tools.py
│   │   │   ├── report_tools.py
│   │   │   └── receipt_tools.py   # OCR multimodal
│   │   ├── memory/
│   │   │   ├── session.py         # Redis session memory
│   │   │   ├── facts.py           # PostgreSQL fact memory
│   │   │   ├── semantic.py        # pgvector semantic memory
│   │   │   └── extractor.py       # Background fact extractor
│   │   ├── skills/                # Markdown skill files
│   │   │   ├── tracker/
│   │   │   ├── advisor/
│   │   │   ├── budget/
│   │   │   └── family/
│   │   ├── llm/
│   │   │   ├── provider.py        # Abstract LLM provider
│   │   │   ├── anthropic.py       # Claude integration
│   │   │   ├── openai.py          # GPT integration
│   │   │   ├── google.py          # Gemini integration
│   │   │   └── router.py          # LLM Router (selecção por tarefa)
│   │   ├── insights/
│   │   │   ├── engine.py          # Smart Insights Engine
│   │   │   └── rules.py           # Regras de detecção
│   │   └── cache.py               # Cache de respostas IA
│   │
│   ├── models/                    # SQLAlchemy models
│   │   ├── user.py
│   │   ├── account.py
│   │   ├── transaction.py
│   │   ├── budget.py
│   │   ├── goal.py
│   │   ├── debt.py
│   │   ├── family.py
│   │   ├── notification.py
│   │   ├── memory.py              # Fact memory model
│   │   └── chat.py                # Chat history model
│   │
│   ├── schemas/                   # Pydantic schemas (request/response)
│   ├── services/                  # Business logic layer
│   ├── tasks/                     # Background tasks (Celery ou ARQ)
│   │   ├── insights.py            # Cron: gerar insights
│   │   ├── notifications.py       # Cron: enviar notificações
│   │   ├── recurring.py           # Cron: transacções recorrentes
│   │   └── memory.py              # Cron: actualizar memória semântica
│   └── utils/
│       ├── currency.py            # Conversão cambial BNA
│       └── categories.py          # Categorias default Angola
│
├── alembic/                       # Migrações de DB
├── tests/
├── pyproject.toml
├── Dockerfile
└── .env.example
```

### 2.2 API Endpoints Principais

#### Auth
| Method | Endpoint | Descrição |
|---|---|---|
| POST | `/api/v1/auth/register` | Registar com telefone ou email |
| POST | `/api/v1/auth/login` | Login com password ou OTP |
| POST | `/api/v1/auth/otp/send` | Enviar OTP por SMS |
| POST | `/api/v1/auth/otp/verify` | Verificar OTP |
| POST | `/api/v1/auth/refresh` | Refresh token |

#### Chat (Assistente)
| Method | Endpoint | Descrição |
|---|---|---|
| POST | `/api/v1/chat/message` | Enviar mensagem (texto) |
| POST | `/api/v1/chat/voice` | Enviar áudio (voz) |
| POST | `/api/v1/chat/image` | Enviar imagem (recibo/extracto) |
| GET | `/api/v1/chat/history` | Histórico de conversas |
| POST | `/api/v1/chat/confirm/{action_id}` | Confirmar acção pendente |

#### Accounts
| Method | Endpoint | Descrição |
|---|---|---|
| GET | `/api/v1/accounts` | Listar contas |
| POST | `/api/v1/accounts` | Criar conta |
| GET | `/api/v1/accounts/{id}` | Detalhes da conta |
| PUT | `/api/v1/accounts/{id}` | Actualizar conta |
| DELETE | `/api/v1/accounts/{id}` | Arquivar conta |
| GET | `/api/v1/accounts/summary` | Saldo consolidado |
| POST | `/api/v1/accounts/transfer` | Transferência interna |

#### Transactions
| Method | Endpoint | Descrição |
|---|---|---|
| GET | `/api/v1/transactions` | Listar (com filtros) |
| POST | `/api/v1/transactions` | Criar transacção |
| GET | `/api/v1/transactions/{id}` | Detalhes |
| PUT | `/api/v1/transactions/{id}` | Editar |
| DELETE | `/api/v1/transactions/{id}` | Eliminar |
| POST | `/api/v1/transactions/import` | Import de extracto |
| GET | `/api/v1/transactions/search` | Pesquisa semântica |
| GET | `/api/v1/transactions/recurring` | Transacções recorrentes detectadas |

#### Budgets, Goals, Debts, Family — seguem padrão CRUD similar

#### Reports
| Method | Endpoint | Descrição |
|---|---|---|
| GET | `/api/v1/reports/monthly/{year}/{month}` | Relatório mensal |
| GET | `/api/v1/reports/category-breakdown` | Breakdown por categoria |
| GET | `/api/v1/reports/trends` | Tendências temporais |
| GET | `/api/v1/reports/cashflow` | Cash flow |
| GET | `/api/v1/reports/networth` | Net worth |
| GET | `/api/v1/reports/score` | Score financeiro |
| GET | `/api/v1/reports/family` | Relatório familiar |
| GET | `/api/v1/reports/export/pdf` | Export PDF |

---

## 3. Modelo de Dados (Resumo)

Ver `05_MODELO_DADOS.md` para schema completo. Tabelas principais:

| Tabela | Descrição | Relações |
|---|---|---|
| `users` | Utilizadores | 1:N accounts, 1:N transactions |
| `accounts` | Contas bancárias, carteiras, cash | belongs_to user ou family |
| `transactions` | Movimentos financeiros | belongs_to account + category |
| `categories` | Categorias de gasto/receita | hierárquica (parent_id) |
| `budgets` | Orçamentos mensais | belongs_to user ou family |
| `budget_items` | Itens do orçamento por categoria | belongs_to budget |
| `goals` | Metas de poupança | belongs_to user ou family |
| `debts` | Dívidas e empréstimos | belongs_to user |
| `families` | Agregados familiares | 1:N family_members |
| `family_members` | Membros do agregado | belongs_to family + user |
| `chat_messages` | Histórico de conversas | belongs_to user |
| `user_facts` | Memória de factos | belongs_to user |
| `notifications` | Notificações enviadas | belongs_to user |
| `recurring_patterns` | Padrões recorrentes detectados | belongs_to user |

---

## 4. Segurança

### 4.1 Medidas

| Área | Implementação |
|---|---|
| Autenticação | JWT (access + refresh tokens) com rotação |
| Autorização | RBAC (admin, adult, dependent) por agregado |
| Encriptação em trânsito | TLS 1.3 obrigatório |
| Encriptação em repouso | AES-256 para dados sensíveis no PostgreSQL |
| Dados ao LLM | Mínimo necessário, sem PII quando possível |
| Rate limiting | Por utilizador: 100 req/min API, 20 msg/min chat |
| Input validation | Pydantic schemas em todos os endpoints |
| SQL injection | SQLAlchemy ORM (parametrized queries) |
| CORS | Whitelist de origens permitidas |
| Biometria | FaceID / TouchID / Fingerprint no mobile |
| PIN | PIN de 4-6 dígitos como alternativa |

### 4.2 Privacidade

- Dados financeiros nunca vendidos a terceiros
- Dados nunca usados para treinar modelos de terceiros
- Export completo de dados (RGPD/portabilidade)
- Eliminação de conta com período de graça de 30 dias
- Transacções privadas não visíveis a membros da família

---

## 5. Infraestrutura

### 5.1 Ambientes

| Ambiente | Uso | Hosting |
|---|---|---|
| Local | Desenvolvimento | Docker Compose |
| Staging | Testes e QA | Railway / Render |
| Produção | Utilizadores reais | Railway / Render + Vercel |

### 5.2 Docker Compose (Desenvolvimento)

```yaml
services:
  api:
    build: ./apps/api
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
    depends_on: [db, redis]

  db:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  web:
    build: ./apps/web
    ports: ["3000:3000"]

volumes:
  pgdata:
```

### 5.3 CI/CD

GitHub Actions:
1. **PR** → Lint + Type check + Unit tests
2. **Merge to main** → Build + Integration tests + Deploy staging
3. **Tag release** → Deploy produção
4. **Mobile** → EAS Build (Expo) → TestFlight/Play Console

---

## 6. Offline Support

### 6.1 Estratégia

Angola tem internet instável. A app deve funcionar offline para as operações mais críticas.

| Operação | Offline? | Sync |
|---|---|---|
| Registar transacção | ✅ Sim | Sync quando online |
| Ver saldo e histórico | ✅ Sim (cache local) | Actualiza quando online |
| Chat com assistente | ❌ Não (requer LLM) | Mostra mensagem "sem conexão" |
| Ver orçamento | ✅ Sim (cache local) | Actualiza quando online |
| Metas e progresso | ✅ Sim (cache local) | Actualiza quando online |
| Import de extractos | ❌ Não (requer processamento) | Queued para sync |

### 6.2 Implementação

- **SQLite local** (React Native) ou **IndexedDB** (Web) para cache de dados
- **Queue de operações** pendentes para sync
- **Conflict resolution**: last-write-wins com timestamp
- **Indicador visual** de estado de conexão e operações pendentes
