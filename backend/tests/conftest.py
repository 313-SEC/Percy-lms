"""
Pytest fixtures for Percy LMS backend tests.
Uses an in-memory SQLite database so tests are isolated and fast.
"""
import os
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set test environment BEFORE importing app modules
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-testing-only-64")
os.environ.setdefault("ENCRYPTION_KEY", "yb4SXuT2W_kRO-D3xBdgVVFZaQiUwMQ_7aFx3fNOXKI=")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("STORAGE_PATH", "/tmp/percy-test-storage")
os.environ.setdefault("DEFAULT_ADMIN_PASSWORD", "testpass123")

from app.database import Base
from app.main import app
from app.utils.deps import get_db

_TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
_test_engine = create_async_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
_TestSession = async_sessionmaker(_test_engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    import app.models  # noqa: F401 — register all models
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db():
    async with _TestSession() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def authed_client(client: AsyncClient):
    """Client with a valid access token already set."""
    # Create user via DB directly
    from app.database import AsyncSessionLocal
    from app.models.user import User, UserStats
    from app.utils.security import hash_password

    async with _TestSession() as db:
        user = User(username="testuser", password_hash=hash_password("testpass123"))
        db.add(user)
        await db.flush()
        db.add(UserStats(user_id=user.id))
        await db.commit()

    res = await client.post("/api/auth/login", json={"username": "testuser", "password": "testpass123"})
    token = res.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
