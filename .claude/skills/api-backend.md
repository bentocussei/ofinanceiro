---
description: Build FastAPI backend services, models, and endpoints
globs: ["apps/api/**"]
---

# FastAPI Backend Development

## Stack
- Python 3.13+ with type hints (use modern syntax: `list[str]` not `List[str]`, `X | None` not `Optional[X]`)
- FastAPI 0.135+ with async support
- SQLAlchemy 2.0 (async sessions, mapped_column style)
- Pydantic v2.12+ for validation
- Alembic for migrations
- PostgreSQL 17 + pgvector
- Redis 8 for caching/sessions
- Ruff for linting/formatting
- pytest + pytest-asyncio for testing

## Python 3.13+ Features to Use

```python
# Modern type hints (no imports from typing for builtins)
def get_items(ids: list[str]) -> dict[str, Item]:
    ...

# Union with pipe operator
def find_user(user_id: str) -> User | None:
    ...

# Use `type` statement for type aliases (3.12+)
type UserId = str
type TransactionList = list[Transaction]
```

## Project Structure

```
apps/api/
├── app/
│   ├── main.py              # FastAPI app, middleware, startup
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # Async engine, session factory
│   ├── dependencies.py      # Common dependencies (get_db, get_current_user)
│   ├── models/              # SQLAlchemy models
│   │   ├── base.py          # Base model with id, created_at, updated_at
│   │   ├── user.py
│   │   ├── account.py
│   │   ├── transaction.py
│   │   └── ...
│   ├── schemas/             # Pydantic v2 schemas
│   │   ├── user.py
│   │   ├── transaction.py
│   │   └── ...
│   ├── routers/             # FastAPI routers (one per module)
│   │   ├── auth.py
│   │   ├── accounts.py
│   │   ├── transactions.py
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── auth.py
│   │   ├── transaction.py
│   │   └── ...
│   ├── ai/                  # AI/LLM system
│   │   ├── router_agent.py
│   │   ├── agents/          # Specialist agents
│   │   ├── tools/           # Function-calling tools
│   │   ├── memory/          # Memory system
│   │   └── insights/        # Smart insights engine
│   └── utils/               # Helpers
├── alembic/                 # Migrations
├── tests/                   # pytest tests
├── requirements.txt
└── pyproject.toml
```

## SQLAlchemy 2.0 Patterns (mapped_column)

```python
from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
import uuid
from datetime import datetime

class Base(DeclarativeBase):
    pass

class BaseModel(Base):
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

## Pydantic v2 Schema Pattern

```python
from pydantic import BaseModel, ConfigDict
from datetime import datetime
import uuid

class TransactionCreate(BaseModel):
    amount: int  # centavos
    category_id: uuid.UUID
    description: str
    account_id: uuid.UUID

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: int
    category_id: uuid.UUID
    description: str
    created_at: datetime
```

## Endpoint Pattern

```python
@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TransactionResponse:
    service = TransactionService(db)
    transaction = await service.create(user_id=user.id, data=data)
    return TransactionResponse.model_validate(transaction)
```

## Key Rules

- All monetary values: integers (centavos). NEVER use float for money.
- All queries must be scoped to the authenticated user (user_id filter)
- Family queries: check membership before allowing access
- Pagination: cursor-based for transactions, offset for small collections
- Rate limiting: 100 req/min general, 20 msg/min for chat
- Always return proper HTTP status codes (201 for create, 204 for delete, etc.)
- Background tasks: use FastAPI BackgroundTasks for non-blocking operations
- Health endpoint: GET /health returns DB and Redis connection status
- Use `mapped_column` style (SQLAlchemy 2.0), not legacy `Column()` style

## Testing

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_transaction(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/transactions",
        json={"amount": 500000, "category_id": "...", "description": "Almoço"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["amount"] == 500000
```
