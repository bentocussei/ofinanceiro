# O Financeiro — Post-Launch Operations & Safety

**Estado:** plataforma em produção com utilizadores reais. Cada decisão a partir daqui afecta dados reais que não podem ser perdidos.

Este documento é a fonte única de verdade para:
1. Regras de segurança operacional (HARD RULES)
2. Checklist priorizado de hardening pós-lançamento
3. Procedimentos seguros para operações sensíveis

---

## 1. HARD RULES — operações em produção

> Estas regras são **não-negociáveis**. Violar qualquer uma destas pode causar perda de dados irreversível ou comprometer credibilidade da plataforma.

### Base de dados

1. **NUNCA** correr `seed_production.py` contra a base de dados de produção existente. O script deve detectar dados existentes e abortar. Se for absolutamente necessário re-correr, fazê-lo numa cópia limpa de staging primeiro, validar, exportar como SQL one-shot, rever cada statement antes de aplicar.

2. **NUNCA** fazer `DROP`, `TRUNCATE` ou `DELETE` da base de dados, schema ou tabelas em produção. Sem excepções. Não para "limpeza", não para "re-seed", não porque algo parece partido. Investigar a causa primeiro. Operações destrutivas só com janela de manutenção planeada, sign-off explícito, e backup verificado nos 5 minutos anteriores.

3. **NUNCA** usar `SQLAlchemy Base.metadata.create_all()` em produção. Pode silenciosamente mascarar drift do schema e criar tabelas fora de sync com o modelo. Mudanças de schema só via Alembic.

4. **TODAS** as mudanças de schema via Alembic migrations:
   - Gerar localmente: `alembic revision --autogenerate -m "descrição"`
   - **REVER** o SQL gerado antes de committar — autogenerate não é perfeito
   - Testar em staging com dados realistas
   - Backup de produção imediatamente antes de aplicar
   - Aplicar com `alembic upgrade head` — nunca editar a tabela `alembic_version` à mão
   - Nunca escrever migration que faça `DROP COLUMN` de coluna com dados sem deploy multi-step (deprecate → parar de ler → deploy → drop)

5. **BACKUP** antes de qualquer operação que toque a BD de produção. Mesmo um UPDATE de uma linha. Mesmo um "small fix". O custo de um backup é segundos; o custo de corrupção é a empresa.

6. **TESTAR** em staging primeiro. Migrations, backfills, mass updates, scripts de cleanup — correr em staging com dados realistas, validar resultado, só depois aplicar em produção.

7. **NUNCA** correr shell Python interactivo ou `psql` directamente contra produção casualmente. Se um fix requer SQL manual, escrever como script, rever o diff, dry-run com `BEGIN; ... ROLLBACK;` primeiro, depois correr com commit explícito.

8. **NUNCA** ignorar migrations editando tabelas directamente. Mesmo que seja "só adicionar um default". Escrever migration, testar em staging, deploy.

9. **NUNCA** committar secrets para git. Mesmo temporariamente. Usar Railway env vars. Se um secret foi committado, rotar imediatamente E limpar o git history com `git filter-repo`.

10. **NUNCA** desactivar foreign key constraints, RLS ou check constraints em produção para "facilitar uma operação one-off". Os constraints existem para prevenir corrupção.

11. **TWO-PERSON REVIEW** para qualquer operação que toca dados de produção fora do fluxo normal da app. Mesmo sozinho: escrever a operação como PR, dormir uma noite, depois aplicar. Nunca aplicar destrutivo sob pressão.

12. **EM INCIDENTE**, o primeiro passo é **sempre** parar escritas e snapshot do estado actual — mesmo se o estado parecer partido. O estado actual é evidência forense e âncora de recuperação. Nunca começar a fixar antes de snapshot.

---

## 2. P0 — Crítico, próximas 24-48h

| # | Status | Item | Porquê | Esforço |
|---|--------|------|--------|---------|
| 1 | ⏳ | **Verificar/configurar backups automáticos do PostgreSQL no Railway** — confirmar **frequência + retenção** em Postgres → Settings → Backups | Railway tem snapshots automáticos no plano Pro mas precisas confirmar a política. Sem isto, qualquer perda é definitiva. | 15 min |
| 2 | ✅ | **Backup offsite diário para Cloudflare R2** — `ofinanceiro-backup-cron` corre `0 2 * * *` UTC, escreve em `ofinanceiro-backups/db/<env>/YYYY/MM/DD/`. Restoration drill validado 2026-04-08. | Backups do Railway estão no Railway. Backup independente fora do Railway garante recuperação mesmo num cenário de account compromise. | feito |
| 3 | ✅ | **Alembic configurado e em uso** — baseline aplicada, `Base.metadata.create_all` removido do startup do API. Ver `apps/api/alembic/`. | — | feito |
| 4 | ⏳ | **Verificar Sentry a receber eventos em produção** — disparar 1 erro de teste no API e 1 no Web e confirmar que aparecem nos respectivos projectos do Sentry. SDKs estão wired (`apps/api/app/main.py`, `apps/web/sentry.*.config.ts`) e DSNs configurados nas 4 services. | Sem validação end-to-end, não sabemos se as DSNs estão a chegar ao runtime. | 10 min |
| 5 | ✅ | **Rate limiting** — IP+phone limits em `/auth/register` (3/h) e IP limit em `/auth/otp/send` (10/h) além do limite por phone existente. | — | feito |
| 6 | ✅ | **CORS restrito** — `ALLOWED_ORIGINS=https://ofinanceiro.app,https://ofinanceiro-web-production.up.railway.app` em produção. | — | feito |
| 7 | ⏳ | **Uptime monitor externo** (UptimeRobot ou Better Uptime, gratuito) para `https://api.ofinanceiro.app/health` e `https://ofinanceiro.app`, alertas email/SMS. | Se a app cai às 3h da manhã queres saber antes do user reclamar. | 10 min |

---

## 3. P1 — Importante, primeira semana

| # | Item | Porquê |
|---|------|--------|
| 8 | **Cloudflare em frente ao Railway** | DDoS protection, WAF, cache estático grátis. Aponta o domínio para Cloudflare → Cloudflare aponta para Railway. |
| 9 | **Runbook documentado** (`docs/RUNBOOK.md`) | O que fazer quando: a app cai, BD lenta, erros em massa, suspeita de breach, perda de dados, secret leak |
| 10 | **Healthchecks robustos** (Railway healthcheck path) | Para Railway saber se a app está OK e re-iniciar automaticamente em caso de falha. Endpoint `/health` deve verificar DB, Redis e dependências críticas. |
| 11 | **Migration checklist + script seguro** | Wrapper Python que: 1) snapshot pré, 2) dry-run em staging, 3) confirm prompt, 4) apply, 5) verify post-state |
| 12 | **Audit log das operações sensíveis** | Quem mudou senha, quem eliminou conta, quem fez login admin, mudanças de role/permissões. Armazenar separadamente do log de aplicação. |
| 13 | **2FA opcional para utilizadores + obrigatório para admin** | Phone OTP já existe; adicionar TOTP como segundo factor para contas admin |

---

## 4. P2 — Robustez, primeiras 4 semanas

| # | Item |
|---|------|
| 13b | **Migrar backups offsite de Cloudflare R2 para Backblaze B2** — Decisão temporária para early-stage: começamos com R2 (já temos conta) para reduzir contas a gerir. **Mas isto não é backup verdadeiramente offsite** — se a conta Cloudflare for comprometida, o atacante tem acesso simultâneo aos dados ao vivo (R2 storage de avatares/recibos) E aos backups da BD. Deve ser migrado para Backblaze B2 (ou outro provider independente) quando o projecto crescer ou quando houver mais um par de mãos a ajudar com gestão. Custo total: ~$1/ano. Alta prioridade post-MVP. |
| 14 | Race conditions: idempotency keys em criar transacção (evita duplicados em retry) |
| 15 | Optimistic locking em update de transacção/conta (version column) |
| 16 | Slow query log do Postgres + alertas para queries > 1s |
| 17 | PII redaction antes de enviar ao LLM (CLAUDE.md menciona como planeado) |
| 18 | Política de rotação de secrets (ANTHROPIC_API_KEY, JWT_SECRET, etc.) — todo cada 90 dias |
| 19 | Plano de comunicação com utilizadores (email/SMS) para incidentes |
| 20 | Status page público (instatus.com gratuito) |
| 21 | Backup restoration drill — testar restauro mensal a partir de backup, validar que funciona |
| 22 | Penetration testing básico (OWASP Top 10) |

---

## 5. Procedimentos seguros

### 5.1 Backup manual antes de operação sensível

```bash
# Via Railway CLI
railway run --service postgres-prod 'pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql'

# OU descarregar para local
railway run --service postgres-prod 'pg_dump $DATABASE_URL' > backup_$(date +%Y%m%d_%H%M%S).sql
```

Guardar o ficheiro fora do Railway (S3, B2, máquina local com encriptação) e testar `pg_restore` antes de prosseguir com a operação.

### 5.2 Aplicar migration em produção

```bash
# 1. LOCAL: gerar
cd apps/api
alembic revision --autogenerate -m "add column X to table Y"
# REVER o ficheiro gerado em alembic/versions/

# 2. STAGING: testar
git push staging
railway run --service ofinanceiro-api-staging 'alembic upgrade head'
# Validar que app funciona, fazer smoke test E2E

# 3. PRODUÇÃO: backup → apply
railway run --service postgres-prod 'pg_dump $DATABASE_URL' > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
railway run --service ofinanceiro-api-prod 'alembic upgrade head'

# 4. VERIFICAR: smoke test E2E imediato
# 5. ROLLBACK plan: ter o `alembic downgrade -1` testado em staging
```

### 5.3 Em caso de incidente (corrupção/data loss)

1. **PARAR escritas** — colocar app em modo manutenção (env var `MAINTENANCE_MODE=true` ou via Cloudflare page rule)
2. **SNAPSHOT do estado actual** — `pg_dump` imediato, mesmo se parecer partido
3. **NOTIFICAR utilizadores** via email/status page
4. **INVESTIGAR** com backup em mão — nunca tentar fixar a quente
5. **APLICAR fix** num ambiente isolado primeiro
6. **VALIDAR** com queries de sanidade antes de retomar
7. **POST-MORTEM** documentado em `docs/incidents/<data>-<titulo>.md`

---

## 6. Memória do agente

Estas regras estão guardadas no sistema de memória do Claude Code (em `~/.claude/projects/.../memory/feedback_production_safety.md`) e são lidas em todas as sessões. O agente recusa-se a violar qualquer destas regras mesmo se for instruído a fazê-lo.

**Para o utilizador:** se vires o agente sequer a sugerir uma operação que viole estas regras, é um sinal de que a memória foi corrompida ou ignorada — corrige imediatamente.
