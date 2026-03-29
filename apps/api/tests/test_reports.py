"""Tests for reports endpoints."""

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


async def create_account_and_transactions(
    client: AsyncClient, token: str
) -> None:
    """Helper: create an account with some transactions."""
    acc = await client.post(
        "/api/v1/accounts/",
        json={"name": "Test", "type": "cash", "balance": 50000000},
        headers=auth_header(token),
    )
    account_id = acc.json()["id"]

    # Create expenses
    for desc, amount in [("Supermercado Kero", 350000), ("Gasolina", 800000), ("Restaurante", 150000)]:
        await client.post(
            "/api/v1/transactions/",
            json={"account_id": account_id, "amount": amount, "type": "expense", "description": desc},
            headers=auth_header(token),
        )

    # Create income
    await client.post(
        "/api/v1/transactions/",
        json={"account_id": account_id, "amount": 45000000, "type": "income", "description": "Salário"},
        headers=auth_header(token),
    )


class TestSpendingByCategory:
    @pytest.mark.asyncio
    async def test_spending_by_category_returns_list(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923300001")
        await create_account_and_transactions(client, token)

        response = await client.get(
            "/api/v1/reports/spending-by-category",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_spending_empty_for_new_user(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923300002")

        response = await client.get(
            "/api/v1/reports/spending-by-category",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_spending_with_date_filter(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923300003")

        response = await client.get(
            "/api/v1/reports/spending-by-category?date_from=2020-01-01&date_to=2020-12-31",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json() == []  # No data in 2020


class TestIncomeExpenseSummary:
    @pytest.mark.asyncio
    async def test_summary_returns_totals(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923300010")
        await create_account_and_transactions(client, token)

        response = await client.get(
            "/api/v1/reports/income-expense-summary",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "income" in data
        assert "expense" in data
        assert "balance" in data
        assert data["income"] > 0
        assert data["expense"] > 0

    @pytest.mark.asyncio
    async def test_summary_empty_for_new_user(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923300011")

        response = await client.get(
            "/api/v1/reports/income-expense-summary",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["income"] == 0
        assert data["expense"] == 0
        assert data["balance"] == 0

    @pytest.mark.asyncio
    async def test_summary_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/reports/income-expense-summary")
        assert response.status_code == 401
