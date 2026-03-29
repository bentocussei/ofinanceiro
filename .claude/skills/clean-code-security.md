---
description: Enforce clean code practices, security standards, and code quality across all O Financeiro code
globs: ["**"]
alwaysApply: true
---

# Clean Code & Security Standards

This skill enforces code quality and security across the entire project. It is always active.

---

## SECURITY (OWASP Top 10 + Financial App)

### 1. Injection Prevention
- **SQL**: NEVER use raw SQL strings or f-strings in queries. Always use SQLAlchemy ORM with parameterized queries.
- **NoSQL/Command**: Never pass user input directly to system commands, Redis commands, or eval().
- **XSS**: All user-generated content must be escaped before rendering. React/Next.js does this by default — never use `dangerouslySetInnerHTML` with user data.

```python
# WRONG — SQL injection risk
query = f"SELECT * FROM users WHERE id = '{user_id}'"

# RIGHT — parameterized via ORM
stmt = select(User).where(User.id == user_id)
result = await db.execute(stmt)
```

### 2. Authentication & Session Security
- JWT tokens: short-lived access (15min), long-lived refresh (7 days)
- Refresh tokens: stored in httpOnly cookies (web) or SecureStore (mobile), NEVER in localStorage
- OTP: rate-limit to 5 attempts per phone per 10 minutes, exponential backoff
- PIN/biometric: required for sensitive operations (delete account, export data, large transactions)
- Session invalidation: on password change, on suspicious activity, on user request

### 3. Authorization & Access Control
- Every API endpoint MUST verify the authenticated user owns the resource
- Family endpoints: verify membership AND role before any operation
- Row-Level Security (RLS) in PostgreSQL as defense-in-depth (not sole protection)
- Never trust client-side role/permission claims — always verify server-side

```python
# WRONG — trusts that user_id from request is valid
@router.get("/accounts/{account_id}")
async def get_account(account_id: str, db: AsyncSession = Depends(get_db)):
    return await db.get(Account, account_id)

# RIGHT — scoped to authenticated user
@router.get("/accounts/{account_id}")
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = await db.get(Account, account_id)
    if not account or account.user_id != user.id:
        raise HTTPException(404)
    return account
```

### 4. Input Validation
- Validate ALL input at API boundaries with Pydantic schemas
- Monetary amounts: must be positive integers (centavos), max reasonable limit
- String fields: max length, strip whitespace, reject control characters
- UUIDs: validate format before DB queries
- File uploads: validate MIME type, max size (5MB receipts, 10MB statements)
- Phone numbers: validate format (Angola: +244 9XX XXX XXX)

```python
from pydantic import BaseModel, Field, field_validator

class TransactionCreate(BaseModel):
    amount: int = Field(gt=0, le=100_000_000_00)  # max 100M Kz in centavos
    description: str = Field(max_length=500)
    category_id: uuid.UUID

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        return v.strip()
```

### 5. Sensitive Data Protection
- **PII redaction**: Before sending ANY data to LLMs, redact: full names, phone numbers, account numbers, addresses
- **Logging**: NEVER log tokens, passwords, PINs, full account numbers, or financial amounts with user identifiers
- **Encryption**: AES-256 at rest for sensitive fields (account numbers, phone numbers in backup)
- **Environment variables**: ALL secrets in `.env`, NEVER hardcoded. `.env` in `.gitignore` always.
- **API keys**: rotate regularly, use scoped keys with minimum permissions

```python
# WRONG — logging sensitive data
logger.info(f"User {user.phone} created transaction of {amount} Kz")

# RIGHT — safe logging
logger.info(f"User {user.id} created transaction", extra={"user_id": str(user.id)})
```

### 6. Rate Limiting & Abuse Prevention
- API: 100 req/min per user (general), 20 msg/min (chat)
- Auth: 5 OTP attempts per 10min, 3 login failures → 15min lockout
- File upload: 10 per hour
- AI chat: token budget per user per day (prevent abuse)
- Use Redis for rate limit counters (atomic increment with TTL)

### 7. Dependency Management & Security
- **NEVER edit `package.json` or `requirements.txt` manually** — always install via CLI:
  - Python: `pip install <package>` then `pip freeze > requirements.txt`
  - Node: `npm install <package>` (auto-updates package.json + lockfile)
- Always install latest versions unless there's a specific compatibility reason
- Run `pip audit` and `npm audit` regularly
- Use `npm` lockfile (`package-lock.json`) — always commit it
- Review new dependencies before adding: check maintenance, popularity, known vulnerabilities
- Minimal dependencies: don't add a package for something achievable in 10 lines

### 8. CORS & Headers
- Strict CORS: only allow known origins (web app domain, mobile deep links)
- Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`
- CSP (Content Security Policy) on web app
- No `*` in CORS origins in production

---

## CLEAN CODE PRINCIPLES

### 1. Naming
- Variables/functions: descriptive, intent-revealing names
- Boolean variables: prefix with `is_`, `has_`, `can_`, `should_`
- Collections: plural nouns (`transactions`, `accounts`)
- Functions: verb + noun (`create_transaction`, `get_balance`, `calculate_budget_remaining`)
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase
- Files: snake_case (Python), kebab-case (TypeScript components)

```python
# WRONG
def proc(d, u):
    r = d.query(T).filter(T.uid == u).all()
    return r

# RIGHT
async def get_user_transactions(db: AsyncSession, user_id: uuid.UUID) -> list[Transaction]:
    stmt = select(Transaction).where(Transaction.user_id == user_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
```

### 2. Function Design
- Single responsibility: each function does ONE thing
- Max ~30 lines per function (guideline, not hard rule)
- Max 4 parameters; use a Pydantic model/dataclass for more
- Return early for error cases (guard clauses), keep happy path un-nested
- No side effects in functions named as queries (e.g., `get_balance` should not modify data)

```python
# WRONG — deeply nested
async def process_transaction(data, db, user):
    if data.amount > 0:
        if data.category_id:
            category = await db.get(Category, data.category_id)
            if category:
                if category.user_id == user.id or category.is_system:
                    # ... finally do the work
                    pass

# RIGHT — guard clauses
async def process_transaction(data: TransactionCreate, db: AsyncSession, user: User) -> Transaction:
    if data.amount <= 0:
        raise ValueError("Amount must be positive")

    category = await db.get(Category, data.category_id)
    if not category:
        raise HTTPException(404, "Categoria não encontrada")

    if category.user_id != user.id and not category.is_system:
        raise HTTPException(403, "Sem permissão para esta categoria")

    return await _create_transaction(db, user.id, data, category)
```

### 3. Error Handling
- Use specific exception types, not bare `except:`
- Create domain exceptions: `InsufficientBudgetError`, `FamilyPermissionError`
- API errors: always return structured JSON with error code + Portuguese message
- Log errors with context (user_id, request_id) but WITHOUT sensitive data
- Never swallow exceptions silently

```python
# API error response format
{
    "detail": {
        "code": "BUDGET_EXCEEDED",
        "message": "O orçamento de alimentação foi ultrapassado",
        "context": {"budget_id": "...", "remaining": 0, "overspent": 15000}
    }
}
```

### 4. Code Organization
- One model per file in `models/`
- One router per module in `routers/`
- Business logic in `services/`, not in routers
- Routers are thin: validate input → call service → return response
- No circular imports: models → schemas → services → routers (one direction)

### 5. TypeScript Specifics
- No `any` — use `unknown` and narrow with type guards if truly dynamic
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use discriminated unions for state management (loading/success/error)
- Zod for runtime validation at API boundaries (form submissions)

```tsx
// WRONG
const [data, setData] = useState<any>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

// RIGHT — discriminated union via React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['transactions', accountId],
  queryFn: () => api.getTransactions(accountId),
})
```

### 6. Database Query Safety
- Always use `select()` with explicit columns for large tables (avoid `SELECT *` in production)
- Index frequently queried columns: `user_id`, `account_id`, `category_id`, `created_at`
- Use `EXPLAIN ANALYZE` for slow queries
- Transactions: use `async with db.begin():` for multi-step operations
- Never N+1: use `joinedload()` or `selectinload()` for related data

### 7. API Design
- RESTful: `GET /transactions`, `POST /transactions`, `GET /transactions/{id}`
- Consistent response envelope for lists: `{ "items": [...], "cursor": "..." }`
- Always version APIs: `/api/v1/...`
- Use HTTP status codes correctly: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Validation Error, 429 Too Many Requests
- Idempotency keys for POST endpoints that create resources (prevent duplicate transactions)

---

## CODE REVIEW CHECKLIST

Before considering any code complete, verify:

- [ ] No hardcoded secrets, tokens, or credentials
- [ ] All user input validated with Pydantic/Zod
- [ ] All DB queries scoped to authenticated user
- [ ] No raw SQL strings
- [ ] Error messages in Portuguese (pt-AO) for user-facing errors
- [ ] Monetary values as integers (centavos), never float
- [ ] No `any` types in TypeScript
- [ ] Async/await used correctly (no blocking calls in async context)
- [ ] Sensitive data not logged
- [ ] Rate limiting considered for new endpoints
- [ ] Tests cover happy path + at least one error case
