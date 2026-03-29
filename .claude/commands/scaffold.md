Generate boilerplate code for O Financeiro.

## Argument
$ARGUMENTS — what to scaffold (e.g., "api router for transactions", "mobile screen for budgets", "web page for dashboard")

## Scaffold Types

### FastAPI Router (apps/api)
```
apps/api/app/routers/<module>.py     # Router with CRUD endpoints
apps/api/app/models/<module>.py      # SQLAlchemy models
apps/api/app/schemas/<module>.py     # Pydantic v2 schemas
apps/api/app/services/<module>.py    # Business logic
apps/api/tests/test_<module>.py      # pytest tests
```
- Include proper type hints, async/await, dependency injection
- Add to router registry in main.py

### Next.js Page (apps/web)
```
apps/web/app/(dashboard)/<route>/page.tsx    # Page component
apps/web/app/(dashboard)/<route>/loading.tsx # Loading state
apps/web/components/<module>/                # Module-specific components
```
- App Router with server/client component separation
- Shadcn UI + Tailwind CSS
- Portuguese (pt-AO) text

### Expo Screen (apps/mobile)
```
apps/mobile/app/(tabs)/<route>.tsx          # Screen
apps/mobile/components/<module>/            # Module components
apps/mobile/hooks/use<Module>.ts            # Custom hooks
```
- Expo Router file-based routing
- React Native components
- Offline-capable patterns

### Alembic Migration
```
apps/api/alembic/versions/<timestamp>_<description>.py
```
- Auto-generate from model changes when possible

## Rules
- All user-facing text in Portuguese (pt-AO)
- Include basic error handling and loading states
- Follow existing project patterns if code already exists
- Add TODO comments for complex logic to implement later

## Allowed Tools
Read, Write, Edit, Glob, Grep, Bash(ls:*), Bash(alembic:*)
