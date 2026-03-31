# ADR-006: Deploy de Monorepo no Railway

**Data:** 2026-03-31
**Estado:** Aceite
**Decisor:** Cussei Bento

## Contexto

Monorepo Turborepo com `apps/api` (FastAPI) e `apps/web` (Next.js). Precisa de deploy automático com CI/CD.

## Decisão

### Estrutura Railway
- 1 projecto com 2 ambientes (production, staging)
- 6 serviços: PostgreSQL, Redis, API, Web, cron-notifications, cron-snapshots
- Deploy triggers: push `main` → production, push `staging` → staging

### Dockerfiles por App
Cada app tem o seu Dockerfile no root directory. Railway detecta automaticamente.

### Problemas Resolvidos

1. **`npm ci` falha sem lockfile** → Monorepo tem `package-lock.json` na raiz, não em `apps/web/`. Solução: usar `npm install`.

2. **`NEXT_PUBLIC_*` mostra localhost** → Variáveis `NEXT_PUBLIC_` são injectadas no build. Docker precisa de `ARG NEXT_PUBLIC_API_URL` + `ENV` para que o build veja a variável.

3. **`railway up` falha com "root directory not found"** → Executar sempre da raiz do monorepo, não de `apps/web/`.

4. **BD inacessível via `railway run`** → DB na rede privada. Solução: `create_all(checkfirst=True)` no startup da API.

5. **Enum conflict no startup** → Múltiplos gunicorn workers tentam criar enums. Solução: `checkfirst=True` + try/except.

### `railway up` Workflow
```bash
# Sempre da RAIZ do monorepo
railway environment production
railway service ofinanceiro-web && railway up
railway service ofinanceiro-api && railway up
```

## Consequências

- Deploy automático via GitHub push
- Staging e production isolados (DBs separadas, secrets diferentes)
- Cron jobs como serviços separados com `curlimages/curl`
- Health check em `/health` (API + DB + Redis)
- Ver `docs/RAILWAY_DEPLOY_GUIDE.md` para guia completo
