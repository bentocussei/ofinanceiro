# Skill: Security Audit

Auditoria de segurança completa para o O Financeiro (backend FastAPI + frontend Next.js).

## Quando usar

- Antes de cada release para produção
- Depois de adicionar novos endpoints ou módulos
- Quando solicitado: `/security-audit`

## Procedimento

### 1. SQL Injection

Verificar que NENHUM endpoint usa SQL raw com input do utilizador.

```bash
# Procurar raw SQL
grep -rn "text(" apps/api/app/routers/ apps/api/app/services/ --include="*.py" | grep -v "# " | grep -v "alembic"
grep -rn "raw_connection\|execute.*f\"\|execute.*%s" apps/api/app/ --include="*.py"
```

**Esperado:** Todos os queries usam SQLAlchemy ORM ou `text()` com bind parameters (`:param`). Nenhuma string interpolation em SQL.

### 2. XSS (Cross-Site Scripting)

```bash
# Procurar vectores XSS no frontend
grep -rn "dangerouslySetInnerHTML\|\.innerHTML" apps/web/src/ --include="*.tsx" --include="*.ts"
grep -rn "eval(\|new Function(" apps/web/src/ --include="*.tsx" --include="*.ts"
```

**Esperado:** Zero resultados. React auto-escapa por defeito. Se `dangerouslySetInnerHTML` for necessário, deve sanitizar com DOMPurify.

### 3. CSRF

Verificar:
- API usa Bearer token no header `Authorization` (imune a CSRF)
- Cookies têm `SameSite=Lax` ou `Strict` + `Secure`
- Nenhum endpoint de escrita usa cookies para autenticação

```bash
grep -rn "SameSite\|Secure\|HttpOnly" apps/web/src/lib/ --include="*.ts"
```

**Esperado:** Cookies com `SameSite=Lax; Secure`. Auth via header `Authorization: Bearer`, não via cookies.

### 4. Auth Bypass

Verificar em `apps/api/app/`:

**JWT:**
- `services/auth.py` — tokens têm `type` claim (access vs refresh), verificado na validação
- `config.py` — secrets NÃO são defaults em produção
- `main.py` — startup valida que secrets não são defaults

**Token expiry:**
- Access: 15 minutos
- Refresh: 7 dias

**Login brute force:**
- `routers/auth.py` — rate limit por telefone (5 tentativas / 5 min)
- `services/otp.py` — rate limit OTP (5 tentativas / 10 min)

```bash
grep -rn "check_rate_limit\|rate_limit" apps/api/app/routers/auth.py
grep -rn "jwt_secret\|dev-secret" apps/api/app/config.py
grep -rn "dev-secret\|change-in-production" apps/api/app/main.py
```

**Esperado:** Rate limits activos, JWT secrets validados no startup, tokens com type checking.

### 5. IDOR (Insecure Direct Object Reference)

Para CADA endpoint que aceita UUID no path (`/{id}`), verificar que o query filtra por `user_id` ou `family_id`:

```bash
# Listar todos os endpoints com UUID path params
grep -rn "/{.*_id}" apps/api/app/routers/ --include="*.py" | grep -v "^#"
```

Para cada um verificar:
- GET: filtra por `user_id == user.id` (ou `family_id` em contexto familiar)
- PUT/DELETE: mesma verificação
- `from_account_id` de input do utilizador: verifica `Account.user_id == user.id`

**Padrão seguro:**
```python
stmt = select(Model).where(Model.id == id, Model.user_id == user.id)
```

**Vulnerável:**
```python
result = await db.get(Model, id)  # NÃO verifica ownership!
```

### 6. Rate Limiting

```bash
grep -rn "RateLimitMiddleware\|check_rate_limit" apps/api/app/main.py apps/api/app/routers/ --include="*.py"
```

Verificar:
- `RateLimitMiddleware` está activo (sem condição `if not debug`)
- `/auth/login` tem rate limit por telefone
- `/auth/otp/send` tem rate limit por telefone
- Rate limit graceful se Redis indisponível (try/except, não crash)

### 7. Secrets Expostos

```bash
# Procurar secrets hardcoded
grep -rn "sk-ant-\|sk-proj-\|sk_live_\|sk_test_\|password.*=.*['\"]" apps/ --include="*.py" --include="*.ts" --include="*.tsx" | grep -v "config.py\|test\|example\|placeholder\|CHANGE\|schema\|Field\|label\|type="
```

Verificar:
- `config.py` — todos os secrets com defaults vazios ou de dev
- `seed_production.py` — password admin gerada aleatoriamente (não hardcoded)
- Nenhum `.env` commitado no repositório
- `.gitignore` exclui `.env*`

### 8. Input Validation

```bash
# Procurar endpoints que aceitam dict em vez de Pydantic schema
grep -rn "data: dict" apps/api/app/routers/ --include="*.py"
```

**Esperado:** Zero resultados. Todos os endpoints devem usar Pydantic schemas com:
- Tipos explícitos para cada campo
- `Field(max_length=...)` para strings
- `Field(ge=0)` ou `Field(gt=0)` para valores monetários
- `extra="forbid"` para rejeitar campos desconhecidos

### 9. File Upload

Verificar limites de tamanho:

```bash
grep -rn "max_length\|base64\|content.*str" apps/api/app/routers/ocr.py apps/api/app/routers/imports.py
```

**Esperado:**
- OCR: `image_base64` com `max_length=10_000_000` (~7.5MB imagem)
- Imports: `content` com `max_length=5_000_000` (5MB CSV)
- Nenhum file path aceite do utilizador (previne path traversal)

### 10. CORS

```bash
grep -rn "CORSMiddleware\|allow_origins\|allow_methods\|allow_headers" apps/api/app/main.py
```

**Esperado:**
- `allow_origins` — lista restrita (não `["*"]`), configurada via `ALLOWED_ORIGINS`
- `allow_methods` — restrito: `["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]`
- `allow_headers` — restrito: `["Authorization", "Content-Type", "X-Context"]` (ou similar)
- `allow_credentials=True`

### 11. Security Headers

```bash
grep -rn "X-Content-Type\|X-Frame\|Strict-Transport\|Referrer-Policy\|X-XSS" apps/api/app/main.py
```

**Esperado:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (só em produção)

## Relatório

Após executar todos os checks, gerar relatório com:

| # | Categoria | Estado | Detalhes |
|---|-----------|--------|----------|
| 1 | SQL Injection | SAFE/VULN | ... |
| 2 | XSS | SAFE/VULN | ... |
| ... | ... | ... | ... |

Classificar cada finding como:
- **SAFE** — sem problemas
- **VULNERABILITY** — deve corrigir antes de produção
- **WARNING** — deveria corrigir, menor risco

## Ferramentas automáticas (CI)

Já configuradas em `.github/workflows/ci.yml` job `security`:
- `pip-audit` — vulnerabilidades em dependências Python
- `bandit` — SAST para Python
- `npm audit` — vulnerabilidades em dependências Node
- Secret scanning — padrões de API keys no código
- Frontend pattern scanning — vectores XSS

## Referências

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
