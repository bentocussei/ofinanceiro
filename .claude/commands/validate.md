Run the full validation suite for O Financeiro.

## Checks (in order)

### 1. Python Quality (apps/api)
```bash
ruff check apps/api/
ruff format --check apps/api/
pytest apps/api/tests/ -v --tb=short
```

### 2. TypeScript Quality (apps/web)
```bash
cd apps/web && npx tsc --noEmit
cd apps/web && npx next lint
```

### 3. TypeScript Quality (apps/mobile)
```bash
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npx expo lint
```

### 4. Docker Health
```bash
docker compose ps
docker compose exec postgres pg_isready
docker compose exec redis redis-cli ping
```

### 5. API Health
```bash
curl -s http://localhost:8000/health | jq .
```

## Output Format

```
## Validation Report

| Check | Status | Details |
|-------|--------|---------|
| Python lint | ✅/❌ | ... |
| Python format | ✅/❌ | ... |
| Python tests | ✅/❌ | X passed, Y failed |
| Web TypeScript | ✅/❌ | ... |
| Web lint | ✅/❌ | ... |
| Mobile TypeScript | ✅/❌ | ... |
| Docker services | ✅/❌ | ... |
| API health | ✅/❌ | ... |

### Issues Found
[List any issues with suggested fixes]
```

## Rules
- Skip checks for packages that don't exist yet
- Report actual error messages, not just pass/fail
- Suggest fixes for any failures found

## Allowed Tools
Bash(*), Read, Glob, Grep
