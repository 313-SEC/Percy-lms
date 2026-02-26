"""Gamification stats, achievements, and XP history router."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import Achievement, XPEvent
from app.models.user import User
from app.schemas.gamification import AchievementResponse, GamificationStats, XPEventResponse
from app.services.gamification_service import level_from_xp, xp_for_level, xp_progress
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/stats", response_model=GamificationStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.gamification_service import _get_or_create_stats
    stats = await _get_or_create_stats(db, user)
    await db.commit()

    in_level, to_next = xp_progress(stats.total_xp)
    return GamificationStats(
        total_xp=stats.total_xp,
        level=stats.level,
        xp_in_level=in_level,
        xp_to_next_level=to_next,
        current_streak=stats.current_streak,
        longest_streak=stats.longest_streak,
        total_study_minutes=stats.total_study_minutes,
    )


@router.get("/achievements", response_model=list[AchievementResponse])
async def list_achievements(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Achievement).order_by(Achievement.earned_at.desc()))
    return result.scalars().all()


@router.get("/history", response_model=list[XPEventResponse])
async def xp_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(XPEvent).order_by(XPEvent.earned_at.desc()).limit(min(limit, 200))
    )
    return result.scalars().all()
