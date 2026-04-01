"""Tests for family CRUD, invites, members, spending."""

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


class TestFamilyCRUD:
    @pytest.mark.asyncio
    async def test_create_family(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700001")
        response = await client.post(
            "/api/v1/families/",
            json={"name": "Família Silva"},
            headers=auth_header(token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Família Silva"
        assert len(data["members"]) == 1  # Creator is auto-added
        assert data["invite_code"] is not None

    @pytest.mark.asyncio
    async def test_get_my_family(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700002")
        await client.post(
            "/api/v1/families/", json={"name": "Test Family"},
            headers=auth_header(token),
        )
        response = await client.get("/api/v1/families/me", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json()["name"] == "Test Family"

    @pytest.mark.asyncio
    async def test_no_family_returns_null(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700003")
        response = await client.get("/api/v1/families/me", headers=auth_header(token))
        assert response.status_code == 200
        assert response.json() is None

    @pytest.mark.asyncio
    async def test_cannot_create_two_families(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700004")
        await client.post("/api/v1/families/", json={"name": "F1"}, headers=auth_header(token))
        response = await client.post("/api/v1/families/", json={"name": "F2"}, headers=auth_header(token))
        assert response.status_code == 409


class TestFamilyInvites:
    @pytest.mark.asyncio
    async def test_join_by_code(self, client: AsyncClient) -> None:
        # User A creates family
        token_a = await register_and_get_token(client, "+244923700010")
        create = await client.post(
            "/api/v1/families/", json={"name": "Join Test"},
            headers=auth_header(token_a),
        )
        family_data = create.json()
        invite_code = family_data["invite_code"]
        family_id = family_data["id"]

        # User B sends join request
        token_b = await register_and_get_token(client, "+244923700011")
        response = await client.post(
            "/api/v1/families/join",
            json={"invite_code": invite_code},
            headers=auth_header(token_b),
        )
        assert response.status_code == 201
        assert "message" in response.json()

        # Admin approves the join request
        requests_resp = await client.get(
            f"/api/v1/families/{family_id}/join-requests",
            headers=auth_header(token_a),
        )
        assert requests_resp.status_code == 200
        join_requests = requests_resp.json()
        assert len(join_requests) >= 1
        invite_id = join_requests[0]["id"]

        approve = await client.put(
            f"/api/v1/families/{family_id}/join-requests/{invite_id}/approve",
            headers=auth_header(token_a),
        )
        assert approve.status_code == 200

    @pytest.mark.asyncio
    async def test_invalid_invite_code(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700012")
        response = await client.post(
            "/api/v1/families/join",
            json={"invite_code": "invalid-code"},
            headers=auth_header(token),
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_invite(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700013")
        create = await client.post(
            "/api/v1/families/", json={"name": "Invite Test"},
            headers=auth_header(token),
        )
        family_id = create.json()["id"]

        response = await client.post(
            f"/api/v1/families/{family_id}/invite",
            json={"phone": "+244923700014", "role": "adult"},
            headers=auth_header(token),
        )
        assert response.status_code == 201
        assert response.json()["invite_phone"] == "+244923700014"


class TestFamilyMembers:
    @pytest.mark.asyncio
    async def test_update_member_role(self, client: AsyncClient) -> None:
        # Create family
        token_a = await register_and_get_token(client, "+244923700020")
        create = await client.post(
            "/api/v1/families/", json={"name": "Role Test"},
            headers=auth_header(token_a),
        )
        family_data = create.json()
        invite_code = family_data["invite_code"]
        family_id = family_data["id"]

        # User B sends join request
        token_b = await register_and_get_token(client, "+244923700021")
        await client.post(
            "/api/v1/families/join",
            json={"invite_code": invite_code},
            headers=auth_header(token_b),
        )

        # Admin approves the request
        requests_resp = await client.get(
            f"/api/v1/families/{family_id}/join-requests",
            headers=auth_header(token_a),
        )
        invite_id = requests_resp.json()[0]["id"]
        approve = await client.put(
            f"/api/v1/families/{family_id}/join-requests/{invite_id}/approve",
            headers=auth_header(token_a),
        )
        assert approve.status_code == 200
        member_id = approve.json()["id"]

        # Admin changes B's role to dependent
        response = await client.put(
            f"/api/v1/families/members/{member_id}/role",
            json={"role": "dependent"},
            headers=auth_header(token_a),
        )
        assert response.status_code == 200
        assert response.json()["role"] == "dependent"

    @pytest.mark.asyncio
    async def test_non_admin_cannot_change_role(self, client: AsyncClient) -> None:
        token_a = await register_and_get_token(client, "+244923700022")
        create = await client.post(
            "/api/v1/families/", json={"name": "Perm Test"},
            headers=auth_header(token_a),
        )
        family_data = create.json()
        invite_code = family_data["invite_code"]
        family_id = family_data["id"]
        admin_member_id = family_data["members"][0]["id"]

        token_b = await register_and_get_token(client, "+244923700023")
        await client.post(
            "/api/v1/families/join",
            json={"invite_code": invite_code},
            headers=auth_header(token_b),
        )

        # Admin approves
        requests_resp = await client.get(
            f"/api/v1/families/{family_id}/join-requests",
            headers=auth_header(token_a),
        )
        invite_id = requests_resp.json()[0]["id"]
        await client.put(
            f"/api/v1/families/{family_id}/join-requests/{invite_id}/approve",
            headers=auth_header(token_a),
        )

        # Non-admin tries to change admin's role
        response = await client.put(
            f"/api/v1/families/members/{admin_member_id}/role",
            json={"role": "adult"},
            headers=auth_header(token_b),
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_remove_member(self, client: AsyncClient) -> None:
        token_a = await register_and_get_token(client, "+244923700024")
        create = await client.post(
            "/api/v1/families/", json={"name": "Remove Test"},
            headers=auth_header(token_a),
        )
        family_data = create.json()
        invite_code = family_data["invite_code"]
        family_id = family_data["id"]

        token_b = await register_and_get_token(client, "+244923700025")
        await client.post(
            "/api/v1/families/join",
            json={"invite_code": invite_code},
            headers=auth_header(token_b),
        )

        # Admin approves
        requests_resp = await client.get(
            f"/api/v1/families/{family_id}/join-requests",
            headers=auth_header(token_a),
        )
        invite_id = requests_resp.json()[0]["id"]
        approve = await client.put(
            f"/api/v1/families/{family_id}/join-requests/{invite_id}/approve",
            headers=auth_header(token_a),
        )
        member_id = approve.json()["id"]

        response = await client.delete(
            f"/api/v1/families/members/{member_id}",
            headers=auth_header(token_a),
        )
        assert response.status_code == 204


class TestFamilySpending:
    @pytest.mark.asyncio
    async def test_get_family_spending(self, client: AsyncClient) -> None:
        token = await register_and_get_token(client, "+244923700030")
        create = await client.post(
            "/api/v1/families/", json={"name": "Spending Test"},
            headers=auth_header(token),
        )
        family_id = create.json()["id"]

        response = await client.get(
            f"/api/v1/families/{family_id}/spending",
            headers=auth_header(token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least the admin

    @pytest.mark.asyncio
    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/families/me")
        assert response.status_code == 401
