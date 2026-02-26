"""Tests for authentication endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(authed_client: AsyncClient):
    """authed_client fixture already proves login works (it calls /api/auth/login)."""
    assert authed_client.headers.get("Authorization", "").startswith("Bearer ")


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Wrong password should return 401."""
    res = await client.post("/api/auth/login", json={"username": "nobody", "password": "wrong"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_requires_token(client: AsyncClient):
    """Accessing a protected route without a token should return 403."""
    res = await client.get("/api/courses")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_protected_route_with_token(authed_client: AsyncClient):
    """Authenticated client should reach protected routes."""
    res = await authed_client.get("/api/courses")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, authed_client: AsyncClient):
    """Refresh token endpoint should return a new access token."""
    # Login to get a refresh token
    from app.models.user import User, UserStats
    from app.utils.security import hash_password

    # Use already-created user from authed_client fixture
    res = await client.post("/api/auth/login", json={"username": "testuser", "password": "testpass123"})
    assert res.status_code == 200
    refresh_token = res.json()["refresh_token"]

    refresh_res = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()


@pytest.mark.asyncio
async def test_invalid_refresh_token(client: AsyncClient):
    res = await client.post("/api/auth/refresh", json={"refresh_token": "totally-fake-token"})
    assert res.status_code == 401
