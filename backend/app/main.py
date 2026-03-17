"""
BLACKSITE: Academy — FastAPI application entry point.
Sets up security middleware, CORS, rate limiting, and registers all routers.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings
from app.database import init_db
from app.routers import ai, auth, content, courses, export, gamification, graph, notes, player, pomodoro, review, search, subtitles, upload

settings = get_settings()

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ── First-run admin bootstrap ─────────────────────────────────────────────────
async def _ensure_admin_user() -> None:
    """Create the admin user on first run if no users exist."""
    from sqlalchemy import select, func
    from app.database import AsyncSessionLocal
    from app.models.user import User, UserStats
    from app.utils.security import hash_password

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(func.count(User.id)))
        count = result.scalar()
        if count == 0:
            user = User(
                username="admin",
                password_hash=hash_password(settings.default_admin_password),
            )
            db.add(user)
            await db.flush()
            db.add(UserStats(user_id=user.id))
            await db.commit()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.ensure_storage_dirs()
    await init_db()
    await _ensure_admin_user()
    yield


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="BLACKSITE: Academy",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — localhost only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ── Security headers middleware ───────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "media-src 'self' blob:; "
        "img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    return response


# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(courses.router, prefix=API_PREFIX)
app.include_router(upload.router, prefix=API_PREFIX)
app.include_router(content.router, prefix=API_PREFIX)
app.include_router(player.router, prefix=API_PREFIX)
app.include_router(notes.router, prefix=API_PREFIX)
app.include_router(pomodoro.router, prefix=API_PREFIX)
app.include_router(gamification.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(subtitles.router, prefix=API_PREFIX)
app.include_router(export.router, prefix=API_PREFIX)
app.include_router(search.router, prefix=API_PREFIX)
app.include_router(review.router, prefix=API_PREFIX)
app.include_router(graph.router, prefix=API_PREFIX)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "BLACKSITE: Academy"}
