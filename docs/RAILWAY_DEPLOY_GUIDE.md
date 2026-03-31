# Deploy de Monorepo no Railway — Guia Completo

**Stack:** Next.js 16 + FastAPI (Python 3.13) + PostgreSQL + Redis
**Estrutura:** Turborepo monorepo com `apps/api` e `apps/web`
**Projecto:** O Financeiro

---

## Pré-requisitos

```bash
# Railway CLI instalado
npm install -g @railway/cli

# Login
railway login

# Verificar
railway whoami
```

---

## 1. Criar o Projecto

```bash
railway init --name ofinanceiro
```

Isto cria o projecto e faz link ao directório actual.

---

## 2. Adicionar PostgreSQL e Redis (Templates Nativos)

```bash
# PostgreSQL — cria serviço nativo com variáveis auto-injectadas
railway deploy -t postgres

# Redis — mesmo princípio
railway deploy -t redis
```

**Importante:** Usar `railway deploy -t postgres` e NÃO criar manualmente com `serviceCreate` + imagem Docker. Os templates nativos auto-injectam `DATABASE_URL`, `REDIS_URL`, etc.

---

## 3. Criar Serviços de App via API GraphQL

O CLI não suporta criação não-interactiva de serviços GitHub. Usar a API:

```bash
# Obter token e project ID
RAILWAY_TOKEN=$(python3 -c "import json; d=json.load(open('$HOME/.railway/config.json')); print(d['user']['token'])")
PROJECT_ID=$(python3 -c "import json; d=json.load(open('$HOME/.railway/config.json')); p=d['projects']; k=list(p.keys())[-1]; print(p[k]['project'])")

# Criar serviço API (conectado ao GitHub)
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceCreate(input: { projectId: \"'"$PROJECT_ID"'\", name: \"ofinanceiro-api\", source: { repo: \"bentocussei/ofinanceiro\" } }) { id name } }"}'

# Criar serviço Web (conectado ao GitHub)
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceCreate(input: { projectId: \"'"$PROJECT_ID"'\", name: \"ofinanceiro-web\", source: { repo: \"bentocussei/ofinanceiro\" } }) { id name } }"}'
```

Anotar os IDs retornados:
```
API_SERVICE="<id-retornado>"
WEB_SERVICE="<id-retornado>"
```

---

## 4. Configurar Root Directories e Watch Patterns

Fundamental para monorepo — cada serviço precisa de saber qual pasta observar:

```bash
PROD_ENV="<environment-id>"  # obtido via railway status ou config.json

# API: root = apps/api
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceInstanceUpdate(serviceId: \"'"$API_SERVICE"'\", input: { rootDirectory: \"apps/api\", watchPatterns: [\"apps/api/**\"] }) }"}'

# Web: root = apps/web
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceInstanceUpdate(serviceId: \"'"$WEB_SERVICE"'\", input: { rootDirectory: \"apps/web\", watchPatterns: [\"apps/web/**\"] }) }"}'
```

---

## 5. Configurar Variáveis de Ambiente

### API Service

```bash
# Gerar secrets
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Helper para definir variáveis
set_var() {
  curl -s -X POST https://backboard.railway.app/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { variableUpsert(input: { projectId: \"'"$PROJECT_ID"'\", environmentId: \"'"$PROD_ENV"'\", serviceId: \"'"$1"'\", name: \"'"$2"'\", value: \"'"$3"'\" }) }"}'
}

# Referências aos databases (Railway resolve automaticamente)
set_var $API_SERVICE "DATABASE_URL" '${{Postgres.DATABASE_URL}}'
set_var $API_SERVICE "REDIS_URL" '${{Redis.REDIS_URL}}'

# App config
set_var $API_SERVICE "ENVIRONMENT" "production"
set_var $API_SERVICE "DEBUG" "false"
set_var $API_SERVICE "JWT_SECRET" "$JWT_SECRET"
set_var $API_SERVICE "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"
set_var $API_SERVICE "PORT" "8000"
```

### Web Service

```bash
# NEXT_PUBLIC_API_URL — usar o domínio público da API (definir APÓS criar domínio)
set_var $WEB_SERVICE "NODE_ENV" "production"
```

**Nota:** `NEXT_PUBLIC_API_URL` só pode ser definido depois de criar o domínio da API (passo 7).

---

## 6. Configurar Deploy Triggers (CI/CD)

Associar branches a ambientes:

```bash
REPO="bentocussei/ofinanceiro"

# Production: deploy on push to main
for SVC in "$API_SERVICE" "$WEB_SERVICE"; do
  curl -s -X POST https://backboard.railway.app/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { deploymentTriggerCreate(input: { projectId: \"'"$PROJECT_ID"'\", environmentId: \"'"$PROD_ENV"'\", serviceId: \"'"$SVC"'\", provider: \"github\", repository: \"'"$REPO"'\", branch: \"main\" }) { id } }"}'
done
```

Para staging, criar environment primeiro:
```bash
# Criar ambiente staging
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { environmentCreate(input: { projectId: \"'"$PROJECT_ID"'\", name: \"staging\" }) { id name } }"}'

STAGING_ENV="<id-retornado>"

# Staging: deploy on push to staging branch
for SVC in "$API_SERVICE" "$WEB_SERVICE"; do
  curl -s -X POST https://backboard.railway.app/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { deploymentTriggerCreate(input: { projectId: \"'"$PROJECT_ID"'\", environmentId: \"'"$STAGING_ENV"'\", serviceId: \"'"$SVC"'\", provider: \"github\", repository: \"'"$REPO"'\", branch: \"staging\" }) { id } }"}'
done
```

---

## 7. Gerar Domínios Públicos

```bash
# Domínio para API
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceDomainCreate(input: { serviceId: \"'"$API_SERVICE"'\", environmentId: \"'"$PROD_ENV"'\" }) { domain } }"}'

# Domínio para Web
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceDomainCreate(input: { serviceId: \"'"$WEB_SERVICE"'\", environmentId: \"'"$PROD_ENV"'\" }) { domain } }"}'
```

Anotar os domínios retornados, depois definir:

```bash
# Agora que temos o domínio da API, definir no Web
API_DOMAIN="ofinanceiro-api-production.up.railway.app"
WEB_DOMAIN="ofinanceiro-web-production.up.railway.app"

set_var $WEB_SERVICE "NEXT_PUBLIC_API_URL" "https://$API_DOMAIN"
set_var $API_SERVICE "ALLOWED_ORIGINS" "https://$WEB_DOMAIN,http://localhost:3000"
```

---

## 8. Health Check (API)

```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceInstanceUpdate(serviceId: \"'"$API_SERVICE"'\", input: { healthcheckPath: \"/health\" }) }"}'
```

---

## 9. Dockerfiles para Monorepo

### Problema principal
O `package-lock.json` está na raiz do monorepo, não em `apps/web/`. O Railway define o build context como `apps/web/`, então `npm ci` falha.

### Solução: `npm install` em vez de `npm ci`

**`apps/web/Dockerfile`:**
```dockerfile
FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**`apps/web/next.config.ts`** — obrigatório para standalone:
```typescript
const nextConfig: NextConfig = {
  output: "standalone",
};
```

**`apps/api/Dockerfile`:**
```dockerfile
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "120", \
     "--access-logfile", "-"]
```

**`.dockerignore`** (em ambas as apps):
```
node_modules
.next
.venv
__pycache__
*.pyc
.env
.env.*
```

---

## 10. Database — Criar Tabelas no Startup

O Railway não permite `railway run` com acesso ao DB remoto (rede privada). A solução é criar tabelas automaticamente no startup da API:

```python
# app/main.py — lifespan
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    from app.database import engine
    from app.models import Base
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    except Exception as e:
        logger.warning("Table creation warning: %s", e)
    yield
```

**Importante:** Usar `checkfirst=True` para evitar erros quando múltiplos workers iniciam em paralelo.

### Converter URL do PostgreSQL para asyncpg

O Railway fornece `postgresql://...` mas o SQLAlchemy async precisa de `postgresql+asyncpg://...`:

```python
# app/config.py
@property
def async_database_url(self) -> str:
    url = self.database_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url
```

---

## 11. Comandos Úteis do CLI

```bash
# Listar serviços
railway service                    # Lista e permite seleccionar
railway service ofinanceiro-api    # Linkar a um serviço específico

# Ver logs
railway logs -n 50                 # Últimas 50 linhas do deploy
railway logs -n 50 -b              # Logs de build
railway logs --filter "@level:error"  # Filtrar por erros

# Redeploy
railway redeploy -y               # Forçar redeploy sem confirmação

# Deploy directo (upload do directório local)
# IMPORTANTE: executar SEMPRE a partir da RAIZ do monorepo!
# O Railway aplica o rootDirectory configurado (apps/web ou apps/api)
# Se executar de apps/web/, tenta encontrar apps/web/ dentro de apps/web/ e falha
railway service ofinanceiro-web && railway up   # Deploy web
railway service ofinanceiro-api && railway up   # Deploy API

# Para staging:
railway environment staging
railway service ofinanceiro-web && railway up
railway service ofinanceiro-api && railway up
railway environment production  # voltar a production

# Variáveis de ambiente
railway variables                  # Ver variáveis do serviço linkado

# Abrir dashboard
railway open
```

---

## 12. Verificação Final

```bash
# API health
curl https://ofinanceiro-api-production.up.railway.app/health

# Web landing
curl -s https://ofinanceiro-web-production.up.railway.app/ | head -20

# Teste de registo
curl -X POST https://ofinanceiro-api-production.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone": "+244999888777", "name": "Teste", "password": "test1234", "country": "AO"}'
```

---

## Resumo da Arquitectura Railway

```
┌─────────────────────────────────────────────┐
│              Railway Project                 │
│                                              │
│  ┌──────────┐  ┌──────────┐                │
│  │ Postgres │  │  Redis   │                │
│  │ (native) │  │ (native) │                │
│  └────┬─────┘  └────┬─────┘                │
│       │              │                       │
│       │   DATABASE_URL    REDIS_URL          │
│       │      │              │                │
│  ┌────▼──────▼──────────────▼────┐          │
│  │      ofinanceiro-api          │          │
│  │  root: apps/api               │          │
│  │  Dockerfile: Python 3.13      │          │
│  │  branch: main → production    │          │
│  │  health: /health              │          │
│  └──────────────┬────────────────┘          │
│                 │                             │
│           NEXT_PUBLIC_API_URL                │
│                 │                             │
│  ┌──────────────▼────────────────┐          │
│  │      ofinanceiro-web          │          │
│  │  root: apps/web               │          │
│  │  Dockerfile: Node 22 + Next   │          │
│  │  branch: main → production    │          │
│  └───────────────────────────────┘          │
│                                              │
│  CI/CD: push main → auto deploy             │
│  CI/CD: push staging → auto deploy staging  │
└─────────────────────────────────────────────┘
```

---

## 13. Configurar Ambiente Staging

### Criar via Dashboard (recomendado)

No dashboard do Railway: Settings → Environments → Duplicate Environment → copiar de `production`.
Isto cria cópias de todos os serviços, databases e variáveis.

### Actualizar variáveis que diferem de produção

Após copiar, as variáveis vêm idênticas às de produção. É **obrigatório** mudar:

```bash
STAGING_ENV="<id-do-novo-ambiente>"

# Gerar novos secrets (staging NÃO deve partilhar secrets com produção)
JWT_SECRET_STG=$(openssl rand -hex 32)
JWT_REFRESH_STG=$(openssl rand -hex 32)

# API
set_var $API_SERVICE "ENVIRONMENT" "staging"
set_var $API_SERVICE "DEBUG" "true"
set_var $API_SERVICE "JWT_SECRET" "$JWT_SECRET_STG"
set_var $API_SERVICE "JWT_REFRESH_SECRET" "$JWT_REFRESH_STG"
set_var $API_SERVICE "ALLOWED_ORIGINS" "https://ofinanceiro-web-staging.up.railway.app,http://localhost:3000"

# Web
set_var $WEB_SERVICE "NEXT_PUBLIC_API_URL" "https://ofinanceiro-api-staging.up.railway.app"
```

### Corrigir deploy triggers (branch)

Ao copiar o ambiente, os triggers apontam para `main`. Mudar para `staging`:

```bash
# Listar triggers do staging
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ environment(id: \"'"$STAGING_ENV"'\") { deploymentTriggers { edges { node { id branch } } } } }"}' | python3 -c "
import json, sys
for t in json.load(sys.stdin)['data']['environment']['deploymentTriggers']['edges']:
    print(t['node']['id'], t['node']['branch'])
"

# Actualizar cada trigger para branch staging
for TRIGGER_ID in "<id-trigger-1>" "<id-trigger-2>"; do
  curl -s -X POST https://backboard.railway.app/graphql/v2 \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "mutation { deploymentTriggerUpdate(id: \"'"$TRIGGER_ID"'\", input: { branch: \"staging\" }) { id branch } }"}'
done
```

### Checklist de diferenças staging vs produção

| Variável | Production | Staging |
|----------|-----------|---------|
| `ENVIRONMENT` | `production` | `staging` |
| `DEBUG` | `false` | `true` |
| `JWT_SECRET` | Único produção | **Diferente** |
| `JWT_REFRESH_SECRET` | Único produção | **Diferente** |
| `ALLOWED_ORIGINS` | `*-production.up.railway.app` | `*-staging.up.railway.app` |
| `NEXT_PUBLIC_API_URL` | `*-api-production.up.railway.app` | `*-api-staging.up.railway.app` |
| `DATABASE_URL` | Auto (instância produção) | Auto (instância staging) |
| `REDIS_URL` | Auto (instância produção) | Auto (instância staging) |
| Deploy branch | `main` | `staging` |

---

## Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `npm ci` falha com "no package-lock.json" | Monorepo — lockfile na raiz, não em apps/web | Usar `npm install` no Dockerfile |
| `UniqueViolationError` no startup | Múltiplos workers tentam criar enums | `checkfirst=True` + try/except |
| `UnboundLocalError: phone` | Variável usada antes de definir | Mover normalização antes do check |
| API retorna "Erro interno" | BD sem tabelas | `create_all` no lifespan |
| `postgres://` vs `postgresql+asyncpg://` | Railway dá URL sem driver async | Property `async_database_url` converte |
| Web mostra só 2 routes no build | RAILPACK sem dependências completas | Usar Dockerfile com `npm install` |
| DB inacessível via `railway run` | DB na rede privada do Railway | Criar tabelas no startup da app |

---

*Última actualização: 2026-03-31*
*Projecto: O Financeiro — ofinanceiro.ao*
