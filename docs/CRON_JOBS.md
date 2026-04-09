# Cron Jobs -- Configuracao Railway

## Autenticacao

Os cron jobs usam um `SERVICE_TOKEN` para autenticar com a API.
Este token e definido como variavel de ambiente no Railway e na configuracao local (.env).

```
SERVICE_TOKEN=<token-seguro-gerado-aleatoriamente>
```

Para gerar um token seguro:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## Jobs Configurados

### 1. Verificacao de Notificacoes (a cada hora)

Verifica condicoes como facturas a vencer, saldo baixo, alertas de orcamento e marcos de metas.

**Railway Settings > Cron:**
- Schedule: `0 * * * *` (a cada hora)
- Command:
```bash
curl -X POST https://api.ofinanceiro.app/api/v1/notifications/check \
  -H "X-Service-Token: $SERVICE_TOKEN"
```

### 2. Geracao de Snapshots Financeiros (diariamente a meia-noite)

Gera resumos financeiros mensais para todos os utilizadores activos.

**Railway Settings > Cron:**
- Schedule: `0 0 * * *` (diariamente a meia-noite UTC)
- Command:
```bash
curl -X POST https://api.ofinanceiro.app/api/v1/snapshots/generate \
  -H "X-Service-Token: $SERVICE_TOKEN"
```

---

## Teste Local

```bash
# Definir token no .env
echo 'SERVICE_TOKEN=dev-service-token-123' >> apps/api/.env

# Testar notificacoes
curl -X POST http://localhost:8000/api/v1/notifications/check \
  -H "X-Service-Token: dev-service-token-123"

# Testar snapshots
curl -X POST http://localhost:8000/api/v1/snapshots/generate \
  -H "X-Service-Token: dev-service-token-123"
```

---

### 4. Backup offsite da BD para Cloudflare R2 (diario)

Faz `pg_dump` da base de dados de producao em formato custom (ja comprimido)
e carrega para o bucket `ofinanceiro-backups` no Cloudflare R2.

**Tipo:** standalone (NAO chama a API — usa `pg_dump` directamente contra o Postgres).
Os outros 3 crons (notifications, snapshots, billing) sao apenas wrappers HTTP que
chamam a API; este precisa de acesso directo a BD.

**Servico Railway:** `ofinanceiro-backup-cron`
**Schedule:** `0 2 * * *` (todos os dias as 02:00 UTC = 03:00 Luanda)
**Restart Policy:** Never (cron deve correr uma vez e sair)
**Source:** repo `bentocussei/ofinanceiro` → branch `main` → Dockerfile `/scripts/backup.Dockerfile`
**Watch Paths:** `scripts/**` (so faz rebuild quando mudam ficheiros do backup)

**Variaveis necessarias:**

| Variavel | Como obter |
|---|---|
| `DATABASE_URL` | Referencia: `${{Postgres.DATABASE_URL}}` |
| `R2_ACCESS_KEY_ID` | Token dedicado ao bucket `ofinanceiro-backups` (NAO o token do storage) |
| `R2_SECRET_ACCESS_KEY` | idem |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | `ofinanceiro-backups` |
| `BACKUP_PREFIX` | `db/` |
| `ENVIRONMENT` | `production` |
| `SENTRY_DSN` | DSN do projecto `ofinanceiro-api` no Sentry — para reportar falhas |

**Estrutura das keys no bucket:**

```
db/<env>/<YYYY>/<MM>/<DD>/<env>_<YYYYMMDD_HHMMSS>.dump
```

Exemplo: `db/production/2026/04/08/production_20260408_233724.dump`

**Restauro:** ver `docs/RUNBOOK.md` seccao 3.

**Importante:**
- O token R2 usado por este cron tem de ser **separado** do token da API (que serve
  o bucket `ofinanceiro-storage` para avatares/recibos). Sao buckets diferentes, com
  permissoes diferentes — partilhar token quebra o principio de minimo privilegio.
- Esta configuracao NAO e verdadeiramente offsite — ver `POST_LAUNCH_CHECKLIST.md`
  item P2/13b para o plano de migracao para Backblaze B2.
- A partir de ~500MB de BD, este script vai precisar de streaming (em vez de buffer
  em memoria) e provavelmente upload multipart para R2.

---

## Notas

- Os endpoints aceitam TANTO `X-Service-Token` (para cron) QUANTO JWT Bearer (para utilizadores).
- Com service token: executa para TODOS os utilizadores activos.
- Com JWT: executa apenas para o utilizador autenticado.
- Sem autenticacao valida: retorna 401.
