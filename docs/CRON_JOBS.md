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

## Notas

- Os endpoints aceitam TANTO `X-Service-Token` (para cron) QUANTO JWT Bearer (para utilizadores).
- Com service token: executa para TODOS os utilizadores activos.
- Com JWT: executa apenas para o utilizador autenticado.
- Sem autenticacao valida: retorna 401.
