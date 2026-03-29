Implement a specific task for O Financeiro.

## Argument
$ARGUMENTS — description of what to implement (e.g., "create user model and migration", "add transaction categorization endpoint")

## Mandatory Pre-Implementation Steps

1. **Read the docs**: Before writing ANY code, read the relevant documentation:
   - `docs/02_MODULOS_FUNCIONALIDADES.md` for feature specs
   - `docs/03_ARQUITECTURA_TECNICA.md` for technical architecture
   - `docs/04_ARQUITECTURA_IA.md` for AI-related tasks
   - `docs/05_MODELO_DADOS.md` for data model
   - `docs/06_UI_UX.md` for UI tasks
   - `docs/07_ROADMAP.md` for phase context

2. **Check dependencies**: Verify that prerequisite code exists (models, migrations, endpoints)

3. **Plan the implementation**: List the files to create/modify before writing code

## Implementation Rules

### Python (apps/api)
- Type hints on all functions
- Pydantic v2 schemas for all request/response models
- async/await for I/O operations
- SQLAlchemy 2.0 async patterns
- Alembic migration for any DB changes
- Tests alongside implementation (pytest)
- Ruff-compliant code

### TypeScript (apps/web, apps/mobile)
- Strict mode, no `any`
- App Router patterns (web) / Expo Router (mobile)
- Shadcn UI components (web)
- Zustand for state, React Query for server state
- Tailwind CSS for styling

### Angola-Specific
- All user-facing text in Portuguese (pt-AO)
- Currency formatted as "X.XXX Kz"
- Categories must match Angola context
- Offline-capable design where applicable

### Data Model
- UUIDs for all IDs
- Monetary values as integers (centavos)
- JSONB for flexible metadata
- RLS considerations
- `created_at`, `updated_at` timestamps on all models

## Post-Implementation
- Run linting: `ruff check apps/api/`
- Run tests: `pytest apps/api/tests/`
- Verify the implementation matches the spec

## Allowed Tools
Read, Write, Edit, Glob, Grep, Bash(python:*), Bash(pytest:*), Bash(ruff:*), Bash(npm:*), Bash(npx:*), Bash(alembic:*), Bash(git:*), Bash(docker:*), Bash(curl:*)
