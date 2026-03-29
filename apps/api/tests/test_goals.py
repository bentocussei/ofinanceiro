"""Tests for goals CRUD + contribute + progress endpoints."""

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


class TestGoalCRUD:
    @pytest.mark.asyncio
    async def test_create_goal(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600001")
        response = await client.post(
            "/api/v1/goals/",
            json={"name": "Férias em Cabo Verde", "target_amount": 50000000, "type": "travel"},
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Férias em Cabo Verde"
        assert data["target_amount"] == 50000000
        assert data["current_amount"] == 0
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_list_goals(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600002")
        await client.post(
            "/api/v1/goals/",
            json={"name": "Meta 1", "target_amount": 10000000},
            headers=auth_header(token),
        )
        response = await client.get("/api/v1/goals/", headers=auth_header(token))
        assert response.status_code == 200
        assert len(response.json()) >= 1

    @pytest.mark.asyncio
    async def test_contribute_to_goal(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600003")
        create = await client.post(
            "/api/v1/goals/",
            json={"name": "Poupança", "target_amount": 20000000},
            headers=auth_header(token),
        )
        goal_id = create.json()["id"]

        response = await client.post(
            f"/api/v1/goals/{goal_id}/contribute",
            json={"amount": 5000000, "note": "Primeira contribuição"},
            headers=auth_header(token),
        )
        assert response.status_code == 201
        assert response.json()["amount"] == 5000000

    @pytest.mark.asyncio
    async def test_goal_progress(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600004")
        create = await client.post(
            "/api/v1/goals/",
            json={"name": "Telemóvel", "target_amount": 15000000, "contribution_amount": 3000000},
            headers=auth_header(token),
        )
        goal_id = create.json()["id"]

        # Contribute
        await client.post(
            f"/api/v1/goals/{goal_id}/contribute",
            json={"amount": 3000000},
            headers=auth_header(token),
        )

        response = await client.get(
            f"/api/v1/goals/{goal_id}/progress", headers=auth_header(token)
        )
        assert response.status_code == 200
        data = response.json()
        assert data["current_amount"] == 3000000
        assert data["remaining"] == 12000000
        assert data["percentage"] == 20.0
        assert data["months_remaining"] is not None

    @pytest.mark.asyncio
    async def test_goal_auto_complete(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600005")
        create = await client.post(
            "/api/v1/goals/",
            json={"name": "Pequena Meta", "target_amount": 100000},
            headers=auth_header(token),
        )
        goal_id = create.json()["id"]

        await client.post(
            f"/api/v1/goals/{goal_id}/contribute",
            json={"amount": 100000},
            headers=auth_header(token),
        )

        # Check goal is now completed
        response = await client.get(f"/api/v1/goals/{goal_id}", headers=auth_header(token))
        assert response.json()["status"] == "completed"

    @pytest.mark.asyncio
    async def test_update_goal(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600006")
        create = await client.post(
            "/api/v1/goals/",
            json={"name": "Old", "target_amount": 10000000},
            headers=auth_header(token),
        )
        goal_id = create.json()["id"]

        response = await client.put(
            f"/api/v1/goals/{goal_id}",
            json={"name": "New Name", "target_amount": 20000000},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    @pytest.mark.asyncio
    async def test_delete_goal(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600007")
        create = await client.post(
            "/api/v1/goals/",
            json={"name": "Delete Me", "target_amount": 1000000},
            headers=auth_header(token),
        )
        goal_id = create.json()["id"]
        response = await client.delete(f"/api/v1/goals/{goal_id}", headers=auth_header(token))
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_emergency_fund(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923600008")
        response = await client.get(
            "/api/v1/goals/emergency-fund-recommendation", headers=auth_header(token)
        )
        assert response.status_code == 200
        assert "recommended_amount" in response.json()

    @pytest.mark.asyncio
    async def test_goal_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/goals/")
        assert response.status_code == 401
