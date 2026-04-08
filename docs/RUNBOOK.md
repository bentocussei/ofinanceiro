# O Financeiro — Operations Runbook

**Audiência:** quem está de plantão (hoje: Cussei). Este documento é para ser lido **durante** um incidente, não antes. Procedimentos directos, comandos copiáveis, sem teoria.

> ⚠️ Antes de executar qualquer comando destrutivo, lê `docs/POST_LAUNCH_CHECKLIST.md` secção 1 (HARD RULES). Se em dúvida, **pára e faz snapshot primeiro**.

---

## 0. Acessos rápidos

| Recurso | URL / Comando |
|---|---|
| Railway dashboard | https://railway.app/project/ofinanceiro |
| Cloudflare R2 (backups) | Cloudflare → R2 → `ofinanceiro-backups` |
| Sentry — API | https://gracy-suite-360-lda.sentry.io/projects/ofinanceiro-api/ |
| Sentry — Web | https://gracy-suite-360-lda.sentry.io/projects/ofinanceiro-web/ |
| Health — API | https://api.ofinanceiro.app/health |
| Health — Web | https://ofinanceiro.app |
| Logs — API prod | `railway logs --service ofinanceiro-api --environment production` |
| Logs — Web prod | `railway logs --service ofinanceiro-web --environment production` |
| Logs — backup cron | `railway logs --service ofinanceiro-backup-cron --environment production` |
| Conectar à BD prod | `railway connect --service Postgres --environment production` |

---

## 1. App caiu (5xx generalizado / health a falhar)

1. **Confirmar o blast radius** — é só a API? só o Web? ambos?
   ```bash
   curl -i https://api.ofinanceiro.app/health
   curl -i https://ofinanceiro.app
   ```
2. **Sentry** — abrir dashboard, há um spike de erros? Qual o stack trace? Início do spike coincide com algum deploy?
3. **Railway logs** dos últimos 5 min:
   ```bash
   railway logs --service ofinanceiro-api --environment production
   ```
4. **Se foi um deploy recente que partiu prod:** rollback imediato no Railway dashboard → Service → Deployments → escolher deployment anterior → "Redeploy". **Não** tentes fixar a quente.
5. **Se não foi deploy:** ver health do Postgres e Redis (Railway dashboard → cada serviço → metrics).
6. Comunicar ao users via status page (TODO P1).

---

## 2. Base de dados lenta / queries a estourar timeout

1. Confirmar via Sentry performance ou logs do API (`asyncpg` timeouts).
2. **Top queries activas:**
   ```bash
   railway connect --service Postgres --environment production
   # dentro do psql:
   SELECT pid, now() - query_start AS dur, state, query
   FROM pg_stat_activity
   WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
   ORDER BY dur DESC LIMIT 20;
   ```
3. Se uma query offending está há mais de 1 min e é segura matar:
   ```sql
   SELECT pg_cancel_backend(<pid>);   -- tenta cancelar (gentil)
   SELECT pg_terminate_backend(<pid>); -- força (brutal)
   ```
4. Investigar a causa: `EXPLAIN ANALYZE` da query, ver se falta índice, escalar Postgres se necessário.

---

## 3. Restauro a partir de backup R2

> ⚠️ **Restore para produção destrói os dados actuais.** Faz primeiro um drill para uma BD descartável. Só restauras para prod depois de teres a certeza absoluta e snapshot do estado actual.

### 3.1 Listar backups disponíveis

```bash
python3 -c "
import boto3, os
from botocore.config import Config
c = boto3.client('s3',
    endpoint_url=os.environ['R2_BACKUPS_ENDPOINT'],
    aws_access_key_id=os.environ['R2_BACKUPS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_BACKUPS_SECRET_ACCESS_KEY'],
    region_name='auto', config=Config(signature_version='s3v4'))
r = c.list_objects_v2(Bucket='ofinanceiro-backups', Prefix='db/production/')
for o in sorted(r.get('Contents', []), key=lambda x: x['LastModified']):
    print(f\"{o['Size']:>10} {o['LastModified']} {o['Key']}\")
"
```

(As credenciais estão em `apps/api/.env` como `R2_BACKUPS_*` ou no Railway no serviço `ofinanceiro-backup-cron`.)

### 3.2 Descarregar o backup escolhido

```bash
python3 -c "
import boto3, os
from botocore.config import Config
c = boto3.client('s3',
    endpoint_url=os.environ['R2_BACKUPS_ENDPOINT'],
    aws_access_key_id=os.environ['R2_BACKUPS_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_BACKUPS_SECRET_ACCESS_KEY'],
    region_name='auto', config=Config(signature_version='s3v4'))
c.download_file('ofinanceiro-backups', 'db/production/2026/MM/DD/production_YYYYMMDD_HHMMSS.dump', '/tmp/restore.dump')
print('downloaded', os.path.getsize('/tmp/restore.dump'), 'bytes')
"
```

### 3.3 Drill para BD local descartável

```bash
export PGPASSWORD=ofinanceiro
PG18=/opt/homebrew/opt/postgresql@18/bin
$PG18/dropdb -h localhost -U ofinanceiro restore_drill 2>/dev/null
$PG18/createdb -h localhost -U ofinanceiro restore_drill
$PG18/pg_restore -h localhost -U ofinanceiro -d restore_drill --no-owner --no-privileges /tmp/restore.dump
$PG18/psql -h localhost -U ofinanceiro -d restore_drill -c "
SELECT 'users', count(*) FROM users
UNION ALL SELECT 'transactions', count(*) FROM transactions
UNION ALL SELECT 'accounts', count(*) FROM accounts;"
```

Se os counts batem com o esperado, o backup está bom.

### 3.4 Restauro real para produção (apenas em data loss confirmado)

> ⛔ **PARAR.** Antes deste passo:
> 1. Pôr o site em modo manutenção (Cloudflare page rule ou env var)
> 2. `pg_dump` IMEDIATO da prod actual (mesmo se "partida") → guardar como evidência forense
> 3. Sign-off explícito (mesmo sozinho: dorme uma noite primeiro se a janela permitir)
> 4. Ter o procedimento escrito e revisto **antes** de o executar

```bash
# 1. Snapshot do estado actual (forense)
railway run --service Postgres --environment production -- bash -c 'pg_dump $DATABASE_URL -F c > /tmp/pre_restore_evidence.dump'
# Mover para local + R2 antes de continuar

# 2. Aplicar o backup escolhido — método recomendado: via psql remoto com DATABASE_PUBLIC_URL
# Obter URL pública (não a interna .railway.internal)
railway variables --service Postgres --environment production | grep DATABASE_PUBLIC_URL

# 3. Drop schema e restaurar (DESTRUTIVO)
PG18=/opt/homebrew/opt/postgresql@18/bin
$PG18/psql "$DATABASE_PUBLIC_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
$PG18/pg_restore -d "$DATABASE_PUBLIC_URL" --no-owner --no-privileges /tmp/restore.dump

# 4. Validação pós-restore
$PG18/psql "$DATABASE_PUBLIC_URL" -c "SELECT count(*) FROM users; SELECT max(created_at) FROM transactions;"

# 5. Smoke test E2E pelo browser ANTES de tirar o modo manutenção
```

---

## 4. Suspeita de breach / credentials leak

1. **Identificar o secret afectado** (qual env var, qual serviço).
2. **Rotar imediatamente** no provider de origem:
   - Anthropic / OpenAI: gerar nova key, apagar a antiga
   - Cloudflare R2: criar novo token, apagar antigo
   - Twilio: regenerar auth token
   - JWT_SECRET: gerar novo, **invalida todas as sessões existentes** (efeito colateral aceitável)
   - Stripe: rotar via dashboard
3. **Actualizar Railway:**
   ```bash
   railway variables --service ofinanceiro-api --environment production --set "KEY=novo_valor"
   ```
4. **Se o secret foi committado para git:** correr `git filter-repo` para limpar history e force-push (apenas com sign-off, e avisando todos os clones existentes).
5. **Sentry** — procurar uso anómalo da key antes da rotação.
6. **Post-mortem** em `docs/incidents/`.

---

## 5. Erros em massa de utilizadores (sem outage)

1. Sentry — qual o erro dominante? Quando começou?
2. É um endpoint específico? Um device/browser específico?
3. Ver logs do API filtrados pelo endpoint:
   ```bash
   railway logs --service ofinanceiro-api --environment production | grep "POST /api/v1/<endpoint>"
   ```
4. Reproduzir localmente com o mesmo input. Se não reproduz, é provável ser data-related — investigar BD.
5. Decidir: hotfix imediato vs rollback do último deploy.

---

## 6. Backup cron falhou

Se receberes alerta do Sentry (`backup_to_r2.py` erro):

1. Ver logs:
   ```bash
   railway logs --service ofinanceiro-backup-cron --environment production
   ```
2. Causa típica:
   - **`AccessDenied` no PutObject** → token R2 expirado/sem permissão. Rotar.
   - **`pg_dump exit 1`** → BD inacessível ou versão de cliente incompatível.
   - **`missing required env vars`** → vars não foram propagadas.
3. **Disparar manualmente após fix:** Railway dashboard → `ofinanceiro-backup-cron` → "Run Now".
4. Validar com listagem do bucket (secção 3.1).
5. **Se mais de 24h sem backup, é incidente** — comunicar e investigar a fundo.

---

## 7. Comandos úteis (cheatsheet)

```bash
# Conectar à BD prod (cuidado!)
railway connect --service Postgres --environment production

# Listar serviços e status
railway status --json | python3 -c "import json,sys; [print(e['node']['serviceName']) for e in json.load(sys.stdin)['environments']['edges'][0]['node']['serviceInstances']['edges']]"

# Tail logs com cor
railway logs --service ofinanceiro-api --environment production

# Rollback de deployment
# Dashboard → Service → Deployments → ⋮ → Redeploy num deployment anterior

# Aplicar migration em prod (HARD RULES dizem: backup primeiro)
railway run --service ofinanceiro-api --environment production -- alembic upgrade head

# Forçar redeploy sem code change
railway redeploy --service ofinanceiro-api --environment production --yes

# Listar env vars de um serviço
railway variables --service ofinanceiro-api --environment production
```

---

## 8. Pós-incidente

Sempre que houver incidente real (não drill), criar `docs/incidents/<data>-<titulo>.md` com:

1. **Timeline** (UTC) — quando começou, quando foi detectado, quando foi resolvido
2. **Impacto** — quantos users afectados, que features
3. **Causa raiz** — não "o servidor caiu" mas o **porquê**
4. **Como detectámos** — alerta? user report? sorte?
5. **Como mitigámos** — comandos exactos
6. **Action items** — o que fazer para isto não repetir, com owner e prazo

Sem post-mortem, o mesmo incidente vai repetir-se.
