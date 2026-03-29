"""Tests for budget CRUD endpoints."""


import pytest
from httpx import AsyncClient


async def register_and_get_token(client: AsyncClient, phone: str) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "name": "Test", "password": "senhasegura123"},
    )
    return response.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestBudgetCRUD:
    @pytest.mark.asyncio
    async def test_create_budget(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500001")

        response = await client.post(
            "/api/v1/budgets/",
            json={
                "name": "Março 2026",
                "method": "category",
                "period_type": "monthly",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "items": [],
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Março 2026"
        assert data["method"] == "category"
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_create_budget_with_items(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500002")

        # Get categories for items
        cats = await client.get("/api/v1/categories/", headers=auth_header(token))
        categories = cats.json()
        if len(categories) < 2:
            pytest.skip("Need seeded categories")

        response = await client.post(
            "/api/v1/budgets/",
            json={
                "name": "Com Itens",
                "method": "category",
                "period_type": "monthly",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "items": [
                    {"category_id": categories[0]["id"], "limit_amount": 5000000},
                    {"category_id": categories[1]["id"], "limit_amount": 3000000},
                ],
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_list_budgets(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500003")

        await client.post(
            "/api/v1/budgets/",
            json={
                "name": "Budget 1",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
            },
            headers=auth_header(token),
        )

        response = await client.get("/api/v1/budgets/", headers=auth_header(token))
        assert response.status_code == 200
        assert len(response.json()) >= 1

    @pytest.mark.asyncio
    async def test_get_budget(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500004")

        create = await client.post(
            "/api/v1/budgets/",
            json={"name": "Get Test", "period_start": "2026-03-01", "period_end": "2026-03-31"},
            headers=auth_header(token),
        )
        budget_id = create.json()["id"]

        response = await client.get(f"/api/v1/budgets/{budget_id}", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json()["name"] == "Get Test"

    @pytest.mark.asyncio
    async def test_update_budget(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500005")

        create = await client.post(
            "/api/v1/budgets/",
            json={"name": "Old Name", "period_start": "2026-03-01", "period_end": "2026-03-31"},
            headers=auth_header(token),
        )
        budget_id = create.json()["id"]

        response = await client.put(
            f"/api/v1/budgets/{budget_id}",
            json={"name": "New Name", "rollover": True},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"
        assert response.json()["rollover"] is True

    @pytest.mark.asyncio
    async def test_delete_budget(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500006")

        create = await client.post(
            "/api/v1/budgets/",
            json={"name": "Delete Me", "period_start": "2026-03-01", "period_end": "2026-03-31"},
            headers=auth_header(token),
        )
        budget_id = create.json()["id"]

        response = await client.delete(f"/api/v1/budgets/{budget_id}", headers=auth_header(token))
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_budget_status(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500007")

        create = await client.post(
            "/api/v1/budgets/",
            json={
                "name": "Status Test",
                "period_start": "2026-03-01",
                "period_end": "2026-03-31",
                "total_limit": 10000000,
            },
            headers=auth_header(token),
        )
        budget_id = create.json()["id"]

        response = await client.get(
            f"/api/v1/budgets/{budget_id}/status", headers=auth_header(token)
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_spent" in data
        assert "total_remaining" in data
        assert "percentage" in data
        assert "days_remaining" in data

    @pytest.mark.asyncio
    async def test_budget_not_found(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923500008")
        response = await client.get(
            "/api/v1/budgets/00000000-0000-0000-0000-000000000000",
            headers=auth_header(token),
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_budget_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/budgets/")
        assert response.status_code == 401
