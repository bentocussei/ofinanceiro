# O Financeiro — Estado Actual e Próximos Passos

**Última actualização:** 2026-04-02
**Estado:** Plataforma pronta para lançamento. Faltam apenas credenciais de serviços externos.

---

## CONCLUÍDO (100%)

### Plataforma Web
- [x] 16 módulos pessoais + 16 módulos familiares (paridade total)
- [x] Dashboard com património real (contas + investimentos + activos - dívidas)
- [x] Transacções com audit trail (source_type + source_id em todas)
- [x] Orçamentos com items por categoria, 5 métodos, alertas
- [x] Metas com contribuição vinculada a conta de origem
- [x] Dívidas com pagamento vinculado a conta + simulação
- [x] Investimentos com allocation, insights, simulador, Ask AI skeleton
- [x] Património físico (10 tipos: imóveis, veículos, terrenos, etc.)
- [x] Contas a pagar com lembretes e débito automático
- [x] Fontes de rendimento
- [x] Regras recorrentes com processamento automático via cron
- [x] Relatórios com gráficos Recharts (personal + family com paridade)
- [x] Educação financeira (33 tips, 16 desafios, learning path, achievements)
- [x] Notícias financeiras (23 artigos, câmbios, market summary, impact analysis)
- [x] Notificações com cron job horário
- [x] Chat panel (skeleton pronto para IA)
- [x] Onboarding (5 passos) com redirect automático
- [x] Context switching pessoal/familiar
- [x] Paginação cursor-based em 14 páginas
- [x] API services centralizados (20 service files)
- [x] Error pages (404, error boundary) sem detalhes técnicos

### Autenticação e Segurança
- [x] Registo simplificado: nome + telefone → OTP SMS → entra (sem password obrigatório)
- [x] Login com 2 métodos: senha ou código SMS (OTP)
- [x] JWT com access (15min) + refresh (7 dias)
- [x] Register NÃO retorna tokens — requer verificação OTP
- [x] Rate limiting (API geral + login brute force por telefone)
- [x] Security headers (HSTS, nosniff, X-Frame-Options, XSS, Referrer-Policy)
- [x] CORS restrito a domínios específicos
- [x] Input validation Pydantic com extra="forbid" em todos os endpoints
- [x] IDOR corrigido em todos os routers (ownership verification)
- [x] File upload com limites (OCR 10MB, CSV 5MB)
- [x] JWT secrets validados no startup (exit se default em produção)
- [x] Auditoria de segurança completa (skill: /security-audit)
- [x] CI Security job (pip-audit, bandit, npm audit, secret scanning)

### Billing e Permissões
- [x] 2 planos: Pessoal (1.990 Kz) + Familiar (4.990 Kz)
- [x] Promoções com prioridade, auto-apply, limites, FREE_DAYS/PERCENTAGE/FIXED
- [x] Promoção lançamento: 90 dias grátis
- [x] Código promocional no registo com validação em tempo real
- [x] Module addons (infraestrutura pronta para restringir módulos)
- [x] 115 permissões (93 client + 22 admin), formato module:feature:action
- [x] Permissões por plano, auto-sync no subscribe/upgrade/addon
- [x] Admin RBAC (3 roles: super_admin, support, billing_admin)
- [x] PlanPermission nos endpoints de escrita
- [x] Frontend: PermissionProvider + RequirePermission guards
- [x] Sidebar filtrado por permissões
- [x] Settings com tabs partilhados (Subscrição, Etiquetas, Segurança)
- [x] SecurityTab: definir senha (sem) ou alterar senha (com)
- [x] Stripe webhooks (checkout, invoice, subscription)

### Integridade Financeira
- [x] Contribuição metas debita conta + cria transacção
- [x] Pagamento dívidas debita conta + cria transacção
- [x] Pagamento bills debita conta + cria transacção
- [x] Transferências debitam origem + creditam destino
- [x] Delete transacção reverte balance
- [x] Regras recorrentes processam automaticamente (cron)
- [x] Audit trail: source_type + source_id em todas as transacções
- [x] Activos e investimentos são registos retroactivos (sem débito automático)

### Infraestrutura
- [x] Deploy Railway (production + staging)
- [x] Domínio ofinanceiro.app (+ api.ofinanceiro.app, staging, api-staging)
- [x] CI/CD GitHub Actions (backend lint/test + frontend tsc/build + security)
- [x] Cron jobs Railway (notificações, snapshots, recurring rules)
- [x] 150 backend tests passam
- [x] Seed produção (idempotente) + Seed demo
- [x] Dockerfiles (API + Web) com ARG para NEXT_PUBLIC
- [x] Health check melhorado (API + DB + Redis)

### Comunicação
- [x] Email via Resend (welcome, trial ending, recibo, cancelamento, bill reminder)
- [x] SMS via Twilio Messaging Service "O Financeiro" (OTP + notificações)

### Marketing e Landing
- [x] Landing page com screenshots reais + vídeo demo + lightbox
- [x] 70 screenshots + 3 vídeos capturados (Playwright)
- [x] SEO (robots.txt, sitemap.xml, OG tags, Twitter cards)
- [x] Theme toggle na landing page

### Documentação
- [x] 8 ADRs (context split, API services, permissions, billing, AI, Railway, members, assets)
- [x] RAILWAY_DEPLOY_GUIDE.md (passo a passo completo)
- [x] RAILWAY_DB_RESET.md (limpar BD + seed)
- [x] PRICING_STRATEGY.md
- [x] AI_STRATEGY.md
- [x] CRON_JOBS.md
- [x] PRE_PRODUCTION_CHECKLIST.md
- [x] Skill: security-audit

---

## PENDENTE — Antes do lançamento

### Correr seed em produção
```bash
# Mesmo processo que staging (ver docs/RAILWAY_DB_RESET.md)
DATABASE_URL="postgresql+asyncpg://..." python3 -m scripts.seed_production
```

### Configurar API keys no Railway

| Variável | Serviço | Para quê |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Anthropic | Assistente IA, chat, análise, OCR |
| `OPENAI_API_KEY` | OpenAI | Whisper (voz→texto), embeddings |
| `STRIPE_SECRET_KEY` | Stripe | Pagamentos reais após trial |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Validação de webhooks |

### Criar contas externas

| Serviço | Para quê | Acção |
|---------|---------|-------|
| Sentry | Error tracking | Criar conta → `SENTRY_DSN` no Railway |
| PostHog | Analytics | Criar conta → `POSTHOG_KEY` no Railway |

---

## FUTURO — Não bloqueia lançamento

| # | Item | Notas |
|---|------|-------|
| 1 | **Mobile app** | Estrutura Expo completa existe em apps/mobile/, precisa de implementação |
| 2 | **Painel admin** | Backend 100% pronto (roles, permissions, 21 endpoints), frontend por criar |
| 3 | **PWA** | manifest.json, service worker para offline |
| 4 | **Domínio .ao** | Registar ofinanceiro.ao quando disponível, configurar DNS |
| 5 | **Integração bancária** | Quando APIs bancárias angolanas estiverem disponíveis |
| 6 | **Multicaixa Express** | Pagamento local como alternativa ao Stripe |

---

*Última actualização: 2026-04-02*
