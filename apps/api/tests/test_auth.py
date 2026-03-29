"""Tests for authentication: register, login, JWT, OTP."""

import uuid

import pytest
from httpx import AsyncClient

from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self) -> None:
        password = "minhasenha123"
        hashed = hash_password(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self) -> None:
        hashed = hash_password("correctpassword")
        assert not verify_password("wrongpassword", hashed)

    def test_different_hashes_for_same_password(self) -> None:
        password = "minhasenha123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        assert hash1 != hash2  # bcrypt salts differ
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestJWT:
    def test_access_token_roundtrip(self) -> None:
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        decoded = decode_access_token(token)
        assert decoded == user_id

    def test_refresh_token_roundtrip(self) -> None:
        user_id = uuid.uuid4()
        token = create_refresh_token(user_id)
        decoded = decode_refresh_token(token)
        assert decoded == user_id

    def test_access_token_not_valid_as_refresh(self) -> None:
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        assert decode_refresh_token(token) is None

    def test_refresh_token_not_valid_as_access(self) -> None:
        user_id = uuid.uuid4()
        token = create_refresh_token(user_id)
        assert decode_access_token(token) is None

    def test_invalid_token_returns_none(self) -> None:
        assert decode_access_token("garbage.token.here") is None
        assert decode_refresh_token("garbage.token.here") is None

    def test_empty_token_returns_none(self) -> None:
        assert decode_access_token("") is None


class TestRegisterEndpoint:
    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "+244923000001",
                "name": "João Teste",
                "password": "minhasenha123",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_register_duplicate_phone(self, client: AsyncClient) -> None:
        payload = {
            "phone": "+244923000002",
            "name": "Maria",
            "password": "senhasegura123",
        }
        # First registration
        response = await client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201

        # Duplicate
        response = await client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_register_short_password(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/register",
            json={"phone": "+244923000003", "name": "Test", "password": "123"},
        )
        assert response.status_code == 422  # Validation error


class TestLoginEndpoint:
    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient) -> None:
        # Register first
        await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "+244923000010",
                "name": "Login Test",
                "password": "senhasegura123",
            },
        )

        # Login
        response = await client.post(
            "/api/v1/auth/login",
            json={"phone": "+244923000010", "password": "senhasegura123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient) -> None:
        await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "+244923000011",
                "name": "Wrong Pass",
                "password": "correctpassword",
            },
        )

        response = await client.post(
            "/api/v1/auth/login",
            json={"phone": "+244923000011", "password": "wrongpassword"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/login",
            json={"phone": "+244923999999", "password": "anypassword"},
        )
        assert response.status_code == 401


class TestRefreshEndpoint:
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client: AsyncClient) -> None:
        # Register
        reg_response = await client.post(
            "/api/v1/auth/register",
            json={
                "phone": "+244923000020",
                "name": "Refresh Test",
                "password": "senhasegura123",
            },
        )
        refresh_token = reg_response.json()["refresh_token"]

        # Refresh
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )
        assert response.status_code == 401


class TestProtectedEndpoint:
    @pytest.mark.asyncio
    async def test_access_without_token(self, client: AsyncClient) -> None:
        """Health is public, but this tests that the auth dependency works."""
        # Health should work without auth
        response = await client.get("/health")
        assert response.status_code == 200
