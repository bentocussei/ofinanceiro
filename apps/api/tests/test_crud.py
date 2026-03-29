"""Integration tests for CRUD endpoints: accounts, transactions, categories, transfers."""

import pytest
from httpx import AsyncClient


async def register_and_get_token(client: AsyncClient, phone: str) -> str:
    """Helper: register a user and return access token."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "name": "Test User", "password": "senhasegura123"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestAccounts:
    @pytest.mark.asyncio
    async def test_create_account(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100001")

        response = await client.post(
            "/api/v1/accounts",
            json={"name": "BAI - Conta Corrente", "type": "bank", "balance": 50000000, "icon": "🏦"},
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "BAI - Conta Corrente"
        assert data["type"] == "bank"
        assert data["balance"] == 50000000
        assert data["currency"] == "AOA"

    @pytest.mark.asyncio
    async def test_list_accounts(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100002")

        # Create 2 accounts
        await client.post(
            "/api/v1/accounts",
            json={"name": "Carteira", "type": "cash", "balance": 1000000},
            headers=auth_header(token),
        )
        await client.post(
            "/api/v1/accounts",
            json={"name": "MCX", "type": "digital_wallet"},
            headers=auth_header(token),
        )

        response = await client.get("/api/v1/accounts", headers=auth_header(token))
        assert response.status_code == 200
        accounts = response.json()
        assert len(accounts) == 2

    @pytest.mark.asyncio
    async def test_update_account(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100003")

        create = await client.post(
            "/api/v1/accounts",
            json={"name": "Old Name", "type": "cash"},
            headers=auth_header(token),
        )
        account_id = create.json()["id"]

        response = await client.put(
            f"/api/v1/accounts/{account_id}",
            json={"name": "New Name", "icon": "💰"},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"
        assert response.json()["icon"] == "💰"

    @pytest.mark.asyncio
    async def test_delete_account(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100004")

        create = await client.post(
            "/api/v1/accounts",
            json={"name": "To Delete", "type": "cash"},
            headers=auth_header(token),
        )
        account_id = create.json()["id"]

        response = await client.delete(
            f"/api/v1/accounts/{account_id}", headers=auth_header(token)
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_account_summary(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100005")

        await client.post(
            "/api/v1/accounts",
            json={"name": "Bank", "type": "bank", "balance": 30000000},
            headers=auth_header(token),
        )
        await client.post(
            "/api/v1/accounts",
            json={"name": "Cash", "type": "cash", "balance": 5000000},
            headers=auth_header(token),
        )

        response = await client.get("/api/v1/accounts/summary", headers=auth_header(token))
        assert response.status_code == 200
        data = response.json()
        assert data["total_assets"] == 35000000
        assert data["net_worth"] == 35000000

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/accounts")
        assert response.status_code == 401  # No auth header

    @pytest.mark.asyncio
    async def test_cannot_access_other_users_account(self, client: AsyncClient) -> None:
        token1 = await register_and_get_token(client, "+244923100006")
        token2 = await register_and_get_token(client, "+244923100007")

        create = await client.post(
            "/api/v1/accounts",
            json={"name": "Private", "type": "bank"},
            headers=auth_header(token1),
        )
        account_id = create.json()["id"]

        # User 2 should not see user 1's account
        response = await client.get(
            f"/api/v1/accounts/{account_id}", headers=auth_header(token2)
        )
        assert response.status_code == 404


class TestTransfers:
    @pytest.mark.asyncio
    async def test_transfer_between_accounts(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100010")

        # Create source and destination accounts
        src = await client.post(
            "/api/v1/accounts",
            json={"name": "Source", "type": "bank", "balance": 10000000},
            headers=auth_header(token),
        )
        dst = await client.post(
            "/api/v1/accounts",
            json={"name": "Dest", "type": "savings", "balance": 0},
            headers=auth_header(token),
        )

        response = await client.post(
            "/api/v1/accounts/transfer",
            json={
                "from_account_id": src.json()["id"],
                "to_account_id": dst.json()["id"],
                "amount": 3000000,
                "description": "Poupar para férias",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert "from_transaction_id" in data
        assert "to_transaction_id" in data

    @pytest.mark.asyncio
    async def test_transfer_same_account_fails(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100011")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Same", "type": "bank", "balance": 5000000},
            headers=auth_header(token),
        )
        acc_id = acc.json()["id"]

        response = await client.post(
            "/api/v1/accounts/transfer",
            json={"from_account_id": acc_id, "to_account_id": acc_id, "amount": 1000000},
            headers=auth_header(token),
        )
        assert response.status_code == 400


class TestTransactions:
    @pytest.mark.asyncio
    async def test_create_expense(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100020")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Wallet", "type": "cash", "balance": 5000000},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]

        response = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": account_id,
                "amount": 350000,
                "type": "expense",
                "description": "Almoço no restaurante",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == 350000
        assert data["type"] == "expense"

    @pytest.mark.asyncio
    async def test_create_income(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100021")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Bank", "type": "bank"},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]

        response = await client.post(
            "/api/v1/transactions",
            json={
                "account_id": account_id,
                "amount": 45000000,
                "type": "income",
                "description": "Salário Março",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        assert response.json()["type"] == "income"

    @pytest.mark.asyncio
    async def test_list_transactions_with_pagination(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100022")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Test", "type": "cash", "balance": 10000000},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]

        # Create 3 transactions
        for i in range(3):
            await client.post(
                "/api/v1/transactions",
                json={
                    "account_id": account_id,
                    "amount": 100000 * (i + 1),
                    "type": "expense",
                    "description": f"Transacção {i + 1}",
                },
                headers=auth_header(token),
            )

        response = await client.get(
            "/api/v1/transactions?limit=2", headers=auth_header(token)
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["has_more"] is True

    @pytest.mark.asyncio
    async def test_filter_by_type(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100023")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Filter Test", "type": "cash", "balance": 10000000},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]

        await client.post(
            "/api/v1/transactions",
            json={"account_id": account_id, "amount": 100000, "type": "expense", "description": "gasto"},
            headers=auth_header(token),
        )
        await client.post(
            "/api/v1/transactions",
            json={"account_id": account_id, "amount": 200000, "type": "income", "description": "receita"},
            headers=auth_header(token),
        )

        response = await client.get(
            "/api/v1/transactions?type=income", headers=auth_header(token)
        )
        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 1
        assert items[0]["type"] == "income"

    @pytest.mark.asyncio
    async def test_update_transaction(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100024")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Update Test", "type": "cash", "balance": 5000000},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]

        txn = await client.post(
            "/api/v1/transactions",
            json={"account_id": account_id, "amount": 100000, "type": "expense", "description": "original"},
            headers=auth_header(token),
        )
        txn_id = txn.json()["id"]

        response = await client.put(
            f"/api/v1/transactions/{txn_id}",
            json={"description": "updated", "amount": 200000},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["description"] == "updated"
        assert response.json()["amount"] == 200000

    @pytest.mark.asyncio
    async def test_delete_transaction(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923100025")

        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Delete Test", "type": "cash", "balance": 5000000},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]

        txn = await client.post(
            "/api/v1/transactions",
            json={"account_id": account_id, "amount": 100000, "type": "expense"},
            headers=auth_header(token),
        )
        txn_id = txn.json()["id"]

        response = await client.delete(
            f"/api/v1/transactions/{txn_id}", headers=auth_header(token)
        )
        assert response.status_code == 204
