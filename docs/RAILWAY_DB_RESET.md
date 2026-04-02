# Railway — Limpar BD, Criar Tabelas e Executar Seed

## 1. Obter credenciais da BD

```bash
railway environment staging  # ou production
railway service Postgres
railway variables | grep -E "PGPASSWORD|PGHOST|PGPORT|PGUSER|PGDATABASE|TCP_PROXY"
```

Anotar:
- `RAILWAY_TCP_PROXY_DOMAIN` (ex: hopper.proxy.rlwy.net)
- `RAILWAY_TCP_PROXY_PORT` (ex: 59808)
- `PGPASSWORD`

## 2. Limpar BD

```bash
PGPASSWORD=<password> psql -h <proxy_domain> -p <proxy_port> -U postgres -d railway \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres;"
```

## 3. Recriar tabelas (via API startup)

```bash
railway service ofinanceiro-api
railway redeploy -y
# Esperar ~60 segundos para a API reiniciar e executar create_all
```

Verificar:
```bash
PGPASSWORD=<password> psql -h <proxy_domain> -p <proxy_port> -U postgres -d railway -c "\dt" | head -20
```

## 4. Executar seed de produção

```bash
cd apps/api
DATABASE_URL="postgresql+asyncpg://postgres:<password>@<proxy_domain>:<proxy_port>/railway" \
  .venv/bin/python3 -m scripts.seed_production
```

## 5. Verificar

```bash
PGPASSWORD=<password> psql -h <proxy_domain> -p <proxy_port> -U postgres -d railway -c "
SELECT 'permissions' as t, count(*) FROM permissions
UNION ALL SELECT 'categories', count(*) FROM categories
UNION ALL SELECT 'plans', count(*) FROM plans
UNION ALL SELECT 'promotions', count(*) FROM promotions
UNION ALL SELECT 'admin_roles', count(*) FROM admin_roles;"
```

Esperado: 115 permissions, 84 categories, 2 plans, 1 promotion, 3 admin_roles.

---

*Última actualização: 2026-04-02*
