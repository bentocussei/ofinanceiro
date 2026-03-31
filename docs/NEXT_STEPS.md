# O Financeiro — Próximos Passos

**Estado actual:** Plataforma em produção no Railway com todos os módulos web implementados.

---

## CONCLUÍDO

- [x] CI/CD — GitHub Actions (lint + test + type check + build)
- [x] Dockerfiles — API (Python 3.13 + gunicorn) + Web (Node 22 + Next.js standalone)
- [x] Deploy Railway — Production + Staging configurados
- [x] JWT secrets gerados e configurados
- [x] Rate limiting middleware integrado
- [x] Security headers (HSTS, X-Frame, nosniff, XSS)
- [x] Error handler global (JSON consistente)
- [x] Health check melhorado (API + DB + Redis)
- [x] SEO (robots.txt, sitemap.xml, OG tags)
- [x] Onboarding UI (5 passos)
- [x] Cron jobs (notifications + snapshots com SERVICE_TOKEN)
- [x] Stripe webhooks (checkout, invoice, subscription)
- [x] Testes frontend (Vitest + Playwright)
- [x] Permissões familiares (require_permission em 11 routers)
- [x] Isolamento personal/family (context filtering em todos os routers)
- [x] Paginação (cursor-based em 14 páginas)
- [x] API services centralizados (20 service files)
- [x] Património físico (activos: imóveis, veículos, etc.)
- [x] Investimentos redesenhados (allocation, insights, Ask AI skeleton)
- [x] Educação financeira (33 tips, 16 desafios, learning path, achievements)
- [x] Notícias financeiras (23 artigos, câmbios, market summary, impact analysis)
- [x] Fluxo de membros (pedidos integração, criar directo, renovar código)

---

## PENDENTE — Precisa de serviços externos

| # | Item | Serviço | O que fazer |
|---|------|---------|-------------|
| 1 | **Assistente IA real** | Anthropic + OpenAI | Configurar `ANTHROPIC_API_KEY` e `OPENAI_API_KEY` no Railway. O código detecta automaticamente via factory.py |
| 2 | **SMS OTP real** | Twilio | Configurar `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Número Angola (+244) |
| 3 | **Pagamentos reais** | Stripe | Configurar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Criar planos no dashboard Stripe |
| 4 | **Email transaccional** | SendGrid/Resend | Escolher provider, criar templates (welcome, reset, factura), integrar no código |
| 5 | **Error tracking** | Sentry | Criar conta, configurar `SENTRY_DSN` no Railway (backend + frontend) |
| 6 | **Analytics** | PostHog | Criar conta, configurar `POSTHOG_KEY` no Railway |
| 7 | **Câmbios reais** | BNA API | Integrar API/scraping do BNA para taxas diárias (substituir hardcoded) |
| 8 | **Notícias reais** | RSS/API | Integrar feeds RSS (Jornal de Angola, Expansão, etc.) |

---

## PENDENTE — Mobile App

| # | Item | Notas |
|---|------|-------|
| 1 | Migrar Expo SDK 55 estável | Actualmente usa versões canary |
| 2 | Implementar paridade com web | Contexto pessoal/familiar, todas as páginas |
| 3 | EAS Build | Configurar builds iOS e Android |
| 4 | Push notifications | Firebase/APNS |
| 5 | Testes em dispositivos reais | iPhone + Android |

---

## PENDENTE — Melhorias pós-lançamento

| # | Item | Prioridade |
|---|------|-----------|
| 1 | PWA (manifest.json, service worker) | Média |
| 2 | Logging estruturado (structlog, JSON) | Média |
| 3 | Cache Redis para queries frequentes | Média |
| 4 | CDN para assets estáticos | Baixa |
| 5 | Acessibilidade WCAG 2.1 AA | Média |
| 6 | Domínio customizado (ofinanceiro.ao) | Alta |

---

*Última actualização: 2026-03-31*
