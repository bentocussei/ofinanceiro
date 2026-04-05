# O Financeiro — Estado Actual e Próximos Passos

**Ultima actualizacao:** 2026-04-05
**Estado:** Plataforma pronta para lancamento. Agentic system 100% funcional (61/61 testes E2E).

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
- [x] Chat panel → Assistente dedicado com página completa (/assistant + /family/assistant)
- [x] Onboarding (5 passos) com redirect automático
- [x] Context switching pessoal/familiar
- [x] Paginação cursor-based em 14 páginas
- [x] API services centralizados (20 service files)
- [x] Error pages (404, error boundary) sem detalhes técnicos

### Autenticação e Segurança
- [x] Registo simplificado: nome + telefone → OTP SMS → entra (sem password obrigatório)
- [x] Login com 2 métodos: senha ou código SMS (OTP)
- [x] JWT com access (60min) + refresh (7 dias) + proxy valida expiração
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
- [x] Move transacção entre contas (pessoal ↔ familiar) com reversal
- [x] Regras recorrentes processam automaticamente (cron)
- [x] Audit trail: source_type + source_id em todas as transacções
- [x] Activos e investimentos são registos retroactivos (sem débito automático)

### Agentic System (concluído 2026-04-05)
- [x] 8 skills dinâmicas (markdown, carregadas do disco, resolvidas por agente+mensagem)
- [x] ToolRegistry centralizado (41+ tools, 9 agentes, metadata rica)
- [x] SSE streaming com progresso real das tools ("A consultar saldos...")
- [x] Gráficos inline Chart.js (doughnut, bar, line, area) + MetricCards KPI
- [x] Web search (Anthropic API) + web fetch (httpx + markdownify)
- [x] OCR multimodal (Claude Vision para imagens, pypdf para PDFs)
- [x] Multi-file upload com preview (max 5, thumbnails, texto opcional)
- [x] CRUD completo via chat para todos os módulos (transacções, orçamentos, metas, dívidas, investimentos)
- [x] Services e schemas para debt + investment (criados + routers refactored)
- [x] Contexto familiar em todos os services (family_id passado automaticamente)
- [x] Categorias e contas com IDs no contexto financeiro (LLM selecciona da lista real)
- [x] Confirmação obrigatória para operações de escrita (add, update, delete, move)
- [x] Correcção na confirmação ("sim, mas são 8000 na carteira")
- [x] Acentuação correcta em todas as respostas (skills + prompts)
- [x] Data actual injectada no contexto (LLM sabe o ano)
- [x] Label "FINANCEIRO" (não mostra nomes internos dos agentes)
- [x] 61/61 testes E2E passaram
- [x] Arquitectura documentada (docs/04_ARQUITECTURA_IA_v2.md + diagramas mermaid)

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
- [x] 10 ADRs (context split, API services, permissions, billing, AI, Railway, members, assets, voice conversation, news engine)
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

| Variável | Serviço | Para quê | Prioridade |
|----------|---------|---------|-----------|
| `ANTHROPIC_API_KEY` | Anthropic | Chat, analise, OCR, routing (Claude Haiku/Sonnet/Opus) | **Lancamento** |
| `OPENAI_API_KEY` | OpenAI | Embeddings, voz (transcricao), voz (conversacao futura) | **Lancamento** |
| ~~`STRIPE_SECRET_KEY`~~ | ~~Stripe~~ | Ja configurado (live mode) | Feito |
| ~~`STRIPE_WEBHOOK_SECRET`~~ | ~~Stripe~~ | Ja configurado | Feito |

### Criar contas externas

| Serviço | Para quê | Acção |
|---------|---------|-------|
| Sentry | Error tracking | Criar conta → `SENTRY_DSN` no Railway |
| PostHog | Analytics | Criar conta → `POSTHOG_KEY` no Railway |

---

## FUTURO — Melhorias pós-lançamento (por ordem de impacto)

### Agentic System
| # | Item | Impacto | Notas |
|---|------|---------|-------|
| 1 | **Streaming de texto token-by-token** | Alto — UX | Actualmente envia resposta completa. Implementar text streaming via SSE para respostas progressivas |
| 2 | **Import de extractos bancários (CSV/Excel)** | Alto | Parser de extractos BFA, BAI, BIC — importação automática de transacções |
| 3 | **BNA crawler — taxas de câmbio reais** | Médio | Actualmente estáticas no news agent. Implementar crawler do site BNA |
| 4 | **Voice input (OpenAI Whisper)** | Médio | Transcrição de áudio para texto. Mobile first |
| 5 | **MCP — integração com serviços externos** | Baixo | Model Context Protocol para conectar a APIs bancárias, BNA, etc. |

### Plataforma
| # | Item | Impacto | Notas |
|---|------|---------|-------|
| 1 | **Mobile app** | Alto | Estrutura Expo completa existe em apps/mobile/, precisa de implementação |
| 2 | **Conversação por voz (speech-to-speech)** | Alto | OpenAI Realtime API. Mobile first. Ver ADR-009 |
| 3 | **Painel admin** | Alto | Backend 100% pronto (roles, permissions, 21+ endpoints), frontend por criar |
| 4 | **Activar embeddings semânticos** | Médio | Quando OPENAI_API_KEY configurada — memória semântica para pesquisa por similaridade |
| 5 | **PWA** | Médio | manifest.json, service worker para offline |
| 6 | **Domínio .ao** | Médio | Registar ofinanceiro.ao quando disponível |
| 7 | **Integração bancária** | Baixo | Quando APIs bancárias angolanas estiverem disponíveis |
| 8 | **Multicaixa Express** | Baixo | Pagamento local como alternativa ao Stripe |

---

*Última actualização: 2026-04-05*
