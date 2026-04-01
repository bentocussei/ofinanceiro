import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")
    data = response.json()
    assert data["service"] == "ofinanceiro-api"
    # Health returns 200 if all checks pass, 503 if any fail (e.g. Redis not running).
    # In tests we accept both — the important thing is the endpoint responds.
    assert response.status_code in (200, 503)
    assert data["status"] in ("ok", "degraded")
    assert data["checks"]["api"] == "ok"
