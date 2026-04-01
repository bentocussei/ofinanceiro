"""Test configuration — uses separate ofinanceiro_test database to avoid polluting main DB."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.database import get_db
from app.main import app
from app.models.base import Base

# IMPORTANT: Use separate test database — never touch the main DB
TEST_DB_URL = "postgresql+asyncpg://ofinanceiro:ofinanceiro@localhost:5432/ofinanceiro_test"

engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
test_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables in TEST database before tests, drop after.

    Also seeds essential data (permissions, plans, plan_permissions, promotion)
    so that auth and plan-based permission checks work in tests.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Seed essential data for tests
    async with test_session_factory() as session:
        from app.services.permission import seed_permissions, seed_plan_permissions
        from app.permissions import get_plan_permissions
        from scripts.seed_production import seed_plans, seed_launch_promotion
        from scripts.seed import seed_categories

        await seed_categories(session)
        await seed_permissions(session)
        personal_id, family_id = await seed_plans(session)
        if personal_id and family_id:
            await seed_plan_permissions(session, personal_id, get_plan_permissions("personal"))
            await seed_plan_permissions(session, family_id, get_plan_permissions("family"))
        await seed_launch_promotion(session)
        await session.commit()

    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession]:
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient]:
    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", follow_redirects=True) as ac:
        yield ac
    app.dependency_overrides.clear()
