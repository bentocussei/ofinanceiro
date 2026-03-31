# O Financeiro — Próximos Passos para Produção

**Estado actual:** Plataforma funcional com todos os módulos implementados (web).
**Objectivo:** Deploy para produção no Railway.

---

## 1. CRÍTICO — Bloqueia lançamento

### 1.1 CI/CD (GitHub Actions)
- [ ] Workflow `ci.yml`: lint (ruff) + type check (pyright) + pytest no backend
- [ ] Workflow `ci.yml`: lint (eslint) + type check (tsc) no frontend
- [ ] Workflow `deploy-staging.yml`: push para `staging` → deploy automático
- [ ] Workflow `deploy-production.yml`: push para `main` → deploy automático
- [ ] Branch protection: PR obrigatório para `staging` e `main`

### 1.2 Dockerfiles
- [ ] `apps/api/Dockerfile` — Python 3.13 + uvicorn + gunicorn
- [ ] `apps/web/Dockerfile` — Node 22 + Next.js standalone build
- [ ] `.dockerignore` em ambos
- [ ] Testar build local antes de deploy

### 1.3 API Keys e Secrets (Railway env vars)
- [ ] `JWT_SECRET` — gerar com `openssl rand -hex 32`
- [ ] `JWT_REFRESH_SECRET` — gerar com `openssl rand -hex 32`
- [ ] `ANTHROPIC_API_KEY` — conta Anthropic
- [ ] `OPENAI_API_KEY` — conta OpenAI
- [ ] `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_PHONE_NUMBER` — SMS OTP
- [ ] `ALLOWED_ORIGINS` — domínios de produção
- [ ] `ENVIRONMENT=production`
- [ ] `DEBUG=false`

### 1.4 Rate Limiting — Integrar middleware
- [ ] Adicionar `RateLimitMiddleware` ao `main.py` (código existe em `middleware/rate_limit.py`)
- [ ] Configurar limites: 100 req/min API, 20 msg/min chat, 5 OTP/10min

### 1.5 Security Headers
- [ ] Middleware para: HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP
- [ ] CORS: mudar de `["*"]` para domínios específicos em produção

### 1.6 Error Handler Global
- [ ] `@app.exception_handler(Exception)` com resposta JSON consistente
- [ ] `@app.exception_handler(RequestValidationError)` para erros de validação
- [ ] Logging de erros com stack trace (não expor ao cliente)

---

## 2. ALTO — Necessário para qualidade

### 2.1 Stripe Webhooks
- [ ] Endpoint `POST /api/v1/billing/webhook` para processar eventos Stripe
- [ ] Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted`
- [ ] Actualizar plano do utilizador na BD
- [ ] Testar com Stripe CLI em local

### 2.2 Email Transaccional
- [ ] Escolher provider: SendGrid, AWS SES, ou Resend
- [ ] Templates: boas-vindas, reset password, factura, alerta
- [ ] Integrar no registo (welcome email) e billing (recibo)

### 2.3 Testes Frontend
- [ ] Configurar Vitest + React Testing Library
- [ ] Testes unitários para componentes críticos (auth, transactions, budgets)
- [ ] E2E com Playwright: login → criar transacção → ver dashboard

### 2.4 Cron Jobs (Railway)
- [ ] Notification scheduler: a cada hora (`POST /api/v1/notifications/check`)
- [ ] Finance snapshot: diário à meia-noite (`POST /api/v1/snapshots/generate`)
- [ ] Criar SERVICE_TOKEN para autenticação dos cron jobs

### 2.5 Onboarding UI
- [ ] Página `/onboarding` com flow guiado: moeda → dia salário → primeira conta → demo
- [ ] Redirect automático após registo se `onboarding_completed = false`
- [ ] Backend já pronto (`/api/v1/onboarding/`)

### 2.6 Migrações Alembic
- [ ] Gerar migração definitiva que reflicta o estado actual dos modelos
- [ ] Testar `alembic upgrade head` num DB limpo
- [ ] Adicionar `alembic upgrade head` ao startup do container

---

## 3. MÉDIO — Melhorias pós-lançamento

### 3.1 Health Check Melhorado
- [ ] Verificar conectividade DB e Redis no `/health`
- [ ] Adicionar `/health/ready` para Railway health checks

### 3.2 Logging Estruturado
- [ ] Instalar `structlog` ou usar JSON formatter
- [ ] Log level configurável via env (`LOG_LEVEL=INFO`)

### 3.3 PWA
- [ ] `public/manifest.json` com ícones e cores
- [ ] Service worker para cache offline
- [ ] Meta tags PWA no layout

### 3.4 SEO
- [ ] `public/robots.txt`
- [ ] `public/sitemap.xml` (landing + páginas públicas)
- [ ] Open Graph meta tags para partilha social
- [ ] Structured data (JSON-LD)

### 3.5 Mobile App
- [ ] Migrar de versões canary para Expo SDK 55 estável
- [ ] Implementar paridade com web (contexto pessoal/familiar)
- [ ] EAS Build para iOS e Android
- [ ] Testar em dispositivos reais

### 3.6 Performance
- [ ] Cache headers nas respostas API (`Cache-Control`)
- [ ] CDN para assets estáticos (Railway ou Cloudflare)
- [ ] Next.js `<Image>` para optimização de imagens
- [ ] Redis cache para queries frequentes (dashboard, patrimony)

### 3.7 Acessibilidade
- [ ] Audit WCAG 2.1 AA
- [ ] Testar navegação por teclado
- [ ] Verificar contraste de cores
- [ ] Labels ARIA em todos os formulários

### 3.8 Monitorização
- [ ] Sentry para error tracking (backend + frontend)
- [ ] PostHog para analytics de produto
- [ ] Uptime monitoring (Railway health checks ou UptimeRobot)

---

## 4. DEPENDÊNCIAS EXTERNAS (Resolver antes do lançamento público)

| Serviço | Propósito | Estado | Acção |
|---------|-----------|--------|-------|
| Anthropic | IA conversacional | Mock em dev | Criar conta + API key |
| OpenAI | Embeddings + OCR + voz | Mock em dev | Criar conta + API key |
| Twilio | SMS OTP | Log em dev | Criar conta + número Angola |
| Stripe | Pagamentos/billing | Mock em dev | Criar conta + configurar planos |
| SendGrid/SES | Email transaccional | Inexistente | Escolher e integrar |
| BNA API | Câmbios reais | Hardcoded | Integrar quando disponível |
| Sentry | Error tracking | Inexistente | Criar conta + DSN |
| PostHog | Analytics | Inexistente | Criar conta + key |

---

## 5. MÓDULOS QUE FUNCIONAM MAS USAM DADOS MOCK

| Módulo | O que é mock | Em produção |
|--------|-------------|-------------|
| Educação | 33 tips, 16 desafios, 15 módulos hardcoded | IA gera conteúdo personalizado |
| Notícias | 23 artigos, câmbios hardcoded | RSS feeds + API BNA + NewsAgent |
| Assistente IA | MockLLMProvider | Anthropic/OpenAI real |
| OCR recibos | Mock response | GPT-4o/Sonnet multimodal |
| Voz | Mock text | OpenAI Whisper |
| Market summary | Texto hardcoded | NewsAgent + LLM |
| Investment insights | Regras simples | InvestmentAgent + LLM |

---

*Última actualização: 2026-03-31*
