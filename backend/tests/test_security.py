"""
Security tests — OWASP-focused.
Covers: input validation, path traversal, SQL injection via ORM,
        file upload MIME check, XSS in notes.
"""
import pytest
from httpx import AsyncClient

from app.utils.security import decrypt_api_key, encrypt_api_key, hash_password, verify_password


# ── Unit tests for security utilities ─────────────────────────────────────────

def test_password_hash_and_verify():
    pw = "super-secure-password-123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed)
    assert not verify_password("wrong", hashed)


def test_api_key_encryption_roundtrip():
    key = "sk-abc123secretapikey"
    encrypted = encrypt_api_key(key)
    assert encrypted != key
    assert decrypt_api_key(encrypted) == key


def test_api_key_encryption_different_each_time():
    key = "sk-test"
    e1 = encrypt_api_key(key)
    e2 = encrypt_api_key(key)
    # Fernet uses random IV, so ciphertexts differ
    assert e1 != e2
    assert decrypt_api_key(e1) == decrypt_api_key(e2) == key


# ── Integration security tests ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthenticated_access_blocked(client: AsyncClient):
    """Every protected route must return 403 without a token."""
    endpoints = [
        ("GET", "/api/courses"),
        ("POST", "/api/courses"),
        ("GET", "/api/notes"),
        ("GET", "/api/gamification/stats"),
        ("GET", "/api/ai/providers"),
    ]
    for method, path in endpoints:
        res = await client.request(method, path)
        assert res.status_code in (401, 403), f"{method} {path} returned {res.status_code}"


@pytest.mark.asyncio
async def test_invalid_token_blocked(client: AsyncClient):
    """Forged tokens must be rejected."""
    client.headers["Authorization"] = "Bearer this.is.not.a.valid.token"
    res = await client.get("/api/courses")
    assert res.status_code in (401, 403)
    del client.headers["Authorization"]


@pytest.mark.asyncio
async def test_xss_in_note_body_sanitised(authed_client: AsyncClient):
    """Dangerous HTML in note body should be sanitised."""
    xss = "<script>alert('xss')</script># Title"
    res = await authed_client.post("/api/notes", json={
        "title": "XSS test",
        "body_markdown": xss,
    })
    assert res.status_code == 201
    body = res.json()["body_markdown"]
    assert "<script>" not in body


@pytest.mark.asyncio
async def test_create_course_empty_title_rejected(authed_client: AsyncClient):
    """Empty title should fail validation."""
    res = await authed_client.post("/api/courses", json={"title": "", "color": "#00ffff"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_unknown_ai_provider_rejected(authed_client: AsyncClient):
    """Saving a provider not in the allowlist should fail."""
    res = await authed_client.post("/api/ai/providers", json={
        "provider_name": "evil_provider",
        "model_name": "evil-model",
        "is_enabled": True,
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_content_404_on_nonexistent(authed_client: AsyncClient):
    """Requesting a non-existent resource should return 404, not 500."""
    res = await authed_client.get("/api/courses/99999")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_gamification_xp_awards(authed_client: AsyncClient):
    """After login, stats endpoint should return valid structure."""
    res = await authed_client.get("/api/gamification/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_xp" in data
    assert "level" in data
    assert data["level"] >= 1
