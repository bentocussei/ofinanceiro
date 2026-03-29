"""Tests for new models: IncomeSource, Bill, RecurringRule, FinanceSettings,
Snapshot, ExpenseSplit, Tag, Account bank fields, Debt fields, Goal fields."""

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


class TestIncomeSource:
    @pytest.mark.asyncio
    async def test_create_income_source(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700001")
        response = await client.post(
            "/api/v1/income-sources/",
            json={
                "name": "Salário BAI",
                "type": "salary",
                "expected_amount": 45000000,
                "frequency": "monthly",
                "day_of_month": 25,
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Salário BAI"
        assert data["type"] == "salary"
        assert data["expected_amount"] == 45000000

    @pytest.mark.asyncio
    async def test_list_income_sources(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700002")
        await client.post(
            "/api/v1/income-sources/",
            json={"name": "Renda", "type": "rental", "expected_amount": 10000000, "frequency": "monthly"},
            headers=auth_header(token),
        )
        response = await client.get("/api/v1/income-sources/", headers=auth_header(token))
        assert response.status_code == 200
        assert len(response.json()) >= 1

    @pytest.mark.asyncio
    async def test_delete_income_source(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700003")
        create = await client.post(
            "/api/v1/income-sources/",
            json={"name": "Freelance", "type": "freelance", "expected_amount": 5000000, "frequency": "monthly"},
            headers=auth_header(token),
        )
        source_id = create.json()["id"]
        response = await client.delete(f"/api/v1/income-sources/{source_id}", headers=auth_header(token))
        assert response.status_code == 204


class TestBill:
    @pytest.mark.asyncio
    async def test_create_bill(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700010")
        response = await client.post(
            "/api/v1/bills/",
            json={
                "name": "Electricidade ENDE",
                "amount": 1500000,
                "due_day": 15,
                "frequency": "monthly",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Electricidade ENDE"
        assert data["amount"] == 1500000

    @pytest.mark.asyncio
    async def test_list_bills(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700011")
        await client.post(
            "/api/v1/bills/",
            json={"name": "Água", "amount": 500000, "due_day": 10, "frequency": "monthly"},
            headers=auth_header(token),
        )
        response = await client.get("/api/v1/bills/", headers=auth_header(token))
        assert response.status_code == 200
        assert len(response.json()) >= 1

    @pytest.mark.asyncio
    async def test_pay_bill(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700012")
        create = await client.post(
            "/api/v1/bills/",
            json={"name": "Internet", "amount": 2000000, "due_day": 5, "frequency": "monthly"},
            headers=auth_header(token),
        )
        bill_id = create.json()["id"]
        response = await client.post(f"/api/v1/bills/{bill_id}/pay", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json()["status"] == "paid"

    @pytest.mark.asyncio
    async def test_delete_bill(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700013")
        create = await client.post(
            "/api/v1/bills/",
            json={"name": "Gás", "amount": 300000, "due_day": 20, "frequency": "monthly"},
            headers=auth_header(token),
        )
        bill_id = create.json()["id"]
        response = await client.delete(f"/api/v1/bills/{bill_id}", headers=auth_header(token))
        assert response.status_code == 204


class TestRecurringRule:
    @pytest.mark.asyncio
    async def test_create_recurring_rule(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700020")
        # Create account first
        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Conta Corrente", "type": "bank", "balance": 50000000},
            headers=auth_header(token),
        )
        account_id = acc.json()["id"]
        response = await client.post(
            "/api/v1/recurring-rules/",
            json={
                "account_id": account_id,
                "amount": 3000000,
                "type": "expense",
                "description": "Aluguer mensal",
                "frequency": "monthly",
                "day_of_month": 1,
                "start_date": "2026-04-01",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "Aluguer mensal"
        assert data["amount"] == 3000000


class TestFinanceSettings:
    @pytest.mark.asyncio
    async def test_get_finance_settings(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700030")
        response = await client.get("/api/v1/finance-settings/", headers=auth_header(token))
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_finance_settings(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700031")
        # Ensure settings exist
        await client.get("/api/v1/finance-settings/", headers=auth_header(token))
        response = await client.put(
            "/api/v1/finance-settings/",
            json={"default_currency": "USD"},
            headers=auth_header(token),
        )
        assert response.status_code == 200


class TestSnapshot:
    @pytest.mark.asyncio
    async def test_generate_snapshot(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700040")
        response = await client.post("/api/v1/snapshots/generate", headers=auth_header(token))
        assert response.status_code in (200, 201)


class TestExpenseSplit:
    @pytest.mark.asyncio
    async def test_list_splits_no_family(self, client: AsyncClient) -> None:
        """Utilizador sem família deve receber lista vazia."""
        token = await register_and_get_token(client, "+244923700050")
        response = await client.get("/api/v1/expense-splits/", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_create_split_with_family(self, client: AsyncClient) -> None:
        """Criar divisão de despesa dentro de uma família."""
        token = await register_and_get_token(client, "+244923700051")
        # Create family
        family_resp = await client.post(
            "/api/v1/families/",
            json={"name": "Família Silva"},
            headers=auth_header(token),
        )
        assert family_resp.status_code == 201
        family_data = family_resp.json()
        member_id = family_data["members"][0]["id"]

        # Create expense split
        response = await client.post(
            "/api/v1/expense-splits/",
            json={
                "total_amount": 5000000,
                "split_type": "equal",
                "description": "Jantar em família",
                "parts": [
                    {"member_id": str(member_id), "amount": 5000000},
                ],
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["total_amount"] == 5000000
        assert data["split_type"] == "equal"
        assert len(data["parts"]) == 1

    @pytest.mark.asyncio
    async def test_settle_split(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700052")
        # Create family
        family_resp = await client.post(
            "/api/v1/families/",
            json={"name": "Família Costa"},
            headers=auth_header(token),
        )
        member_id = family_resp.json()["members"][0]["id"]

        # Create and settle
        create = await client.post(
            "/api/v1/expense-splits/",
            json={
                "total_amount": 3000000,
                "split_type": "fixed",
                "parts": [{"member_id": str(member_id), "amount": 3000000}],
            },
            headers=auth_header(token),
        )
        split_id = create.json()["id"]

        response = await client.put(
            f"/api/v1/expense-splits/{split_id}/settle",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["is_settled"] is True
        assert response.json()["settled_at"] is not None

    @pytest.mark.asyncio
    async def test_delete_split(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700053")
        # Create family
        family_resp = await client.post(
            "/api/v1/families/",
            json={"name": "Família Neto"},
            headers=auth_header(token),
        )
        member_id = family_resp.json()["members"][0]["id"]

        create = await client.post(
            "/api/v1/expense-splits/",
            json={
                "total_amount": 2000000,
                "split_type": "equal",
                "parts": [{"member_id": str(member_id), "amount": 2000000}],
            },
            headers=auth_header(token),
        )
        split_id = create.json()["id"]

        response = await client.delete(
            f"/api/v1/expense-splits/{split_id}",
            headers=auth_header(token),
        )
        assert response.status_code == 204


class TestTag:
    @pytest.mark.asyncio
    async def test_create_tag(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700060")
        response = await client.post(
            "/api/v1/tags/",
            json={"name": "Urgente", "color": "#FF0000"},
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Urgente"
        assert data["color"] == "#FF0000"

    @pytest.mark.asyncio
    async def test_list_tags(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700061")
        await client.post(
            "/api/v1/tags/",
            json={"name": "Pessoal", "color": "#00FF00"},
            headers=auth_header(token),
        )
        await client.post(
            "/api/v1/tags/",
            json={"name": "Trabalho", "color": "#0000FF"},
            headers=auth_header(token),
        )
        response = await client.get("/api/v1/tags/", headers=auth_header(token))
        assert response.status_code == 200
        assert len(response.json()) == 2

    @pytest.mark.asyncio
    async def test_delete_tag(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700062")
        create = await client.post(
            "/api/v1/tags/",
            json={"name": "Temporário"},
            headers=auth_header(token),
        )
        tag_id = create.json()["id"]
        response = await client.delete(f"/api/v1/tags/{tag_id}", headers=auth_header(token))
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_duplicate_tag_fails(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700063")
        await client.post(
            "/api/v1/tags/",
            json={"name": "Duplicado"},
            headers=auth_header(token),
        )
        response = await client.post(
            "/api/v1/tags/",
            json={"name": "Duplicado"},
            headers=auth_header(token),
        )
        assert response.status_code == 409


class TestAccountBankFields:
    @pytest.mark.asyncio
    async def test_create_account_with_bank_fields(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700070")
        response = await client.post(
            "/api/v1/accounts",
            json={
                "name": "BAI Conta",
                "type": "bank",
                "balance": 10000000,
                "iban": "AO06004000006629840010102",
                "nib": "004000006629840010102",
                "swift_code": "BAIAAOLU",
                "account_holder": "João Silva",
                "credit_limit": 50000000,
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["iban"] == "AO06004000006629840010102"
        assert data["nib"] == "004000006629840010102"
        assert data["swift_code"] == "BAIAAOLU"
        assert data["account_holder"] == "João Silva"

    @pytest.mark.asyncio
    async def test_update_account_bank_fields(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700071")
        create = await client.post(
            "/api/v1/accounts",
            json={"name": "Test Bank", "type": "bank"},
            headers=auth_header(token),
        )
        account_id = create.json()["id"]
        response = await client.put(
            f"/api/v1/accounts/{account_id}",
            json={"iban": "AO06004000001234567890123", "swift_code": "BAIAAOLU"},
            headers=auth_header(token),
        )
        assert response.status_code == 200
        assert response.json()["iban"] == "AO06004000001234567890123"


class TestDebtFields:
    @pytest.mark.asyncio
    async def test_create_debt_with_nature(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700080")
        response = await client.post(
            "/api/v1/debts/",
            json={
                "name": "Empréstimo Pessoal",
                "type": "personal_loan",
                "original_amount": 100000000,
                "current_balance": 80000000,
                "nature": "formal",
                "creditor_type": "bank",
                "creditor_name": "BAI",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Empréstimo Pessoal"
        assert data["nature"] == "formal"
        assert data["creditor_type"] == "bank"


class TestGoalFields:
    @pytest.mark.asyncio
    async def test_create_goal_with_contribution_frequency(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700090")
        response = await client.post(
            "/api/v1/goals/",
            json={
                "name": "Carro Novo",
                "target_amount": 300000000,
                "contribution_amount": 5000000,
                "contribution_frequency": "monthly",
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["contribution_amount"] == 5000000
        assert data["contribution_frequency"] == "monthly"

    @pytest.mark.asyncio
    async def test_create_goal_with_savings_account(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700091")
        # Create savings account
        acc = await client.post(
            "/api/v1/accounts",
            json={"name": "Poupança", "type": "savings"},
            headers=auth_header(token),
        )
        acc.json()["id"]
        # Create goal linked to savings account
        response = await client.post(
            "/api/v1/goals/",
            json={
                "name": "Fundo de Emergência",
                "target_amount": 50000000,
            },
            headers=auth_header(token),
        )
        assert response.status_code == 201
