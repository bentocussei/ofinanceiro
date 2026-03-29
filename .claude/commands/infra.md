Manage Docker infrastructure for O Financeiro.

## Argument
$ARGUMENTS — action to perform

## Actions

### `status` (default)
Show status of all Docker services and port mappings.

### `up`
Start development services (PostgreSQL + Redis).
```bash
docker compose up -d
```
Wait for health checks and confirm services are ready.

### `down`
Stop all services gracefully.
```bash
docker compose down
```

### `logs [service]`
Show logs for a specific service or all services.
```bash
docker compose logs --tail=50 [service]
```

### `reset`
⚠️ Destructive — ask for confirmation first.
Stop services, remove volumes, restart fresh.
```bash
docker compose down -v
docker compose up -d
```

### `health`
Check health of all services:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- API: `curl localhost:8000/health`

## Allowed Tools
Bash(docker:*), Bash(docker compose:*), Bash(curl:*), Bash(pg_isready:*)
