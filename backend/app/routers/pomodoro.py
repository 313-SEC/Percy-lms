"""Pomodoro session tracking router."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.progress import PomodoroSession
from app.models.user import User
from app.schemas.progress import PomodoroEnd, PomodoroResponse, PomodoroStart
from app.services.gamification_service import XP_POMODORO_COMPLETE, award_xp, check_and_grant_achievements
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.post("/start", response_model=PomodoroResponse, status_code=status.HTTP_201_CREATED)
async def start_pomodoro(
    body: PomodoroStart,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    session = PomodoroSession(
        content_id=body.content_id,
        session_type=body.session_type,
        duration_minutes=body.duration_minutes,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/{session_id}/end", response_model=PomodoroResponse)
async def end_pomodoro(
    session_id: int,
    body: PomodoroEnd,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(PomodoroSession).where(PomodoroSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.now(timezone.utc)
    session.completed = body.completed

    if body.completed and session.session_type == "work":
        await award_xp(db, user, "pomodoro_complete", XP_POMODORO_COMPLETE, "Completed a Pomodoro session")

        # Count pomodoro sessions for achievements
        count_result = await db.execute(
            select(func.count(PomodoroSession.id)).where(
                PomodoroSession.completed.is_(True),
                PomodoroSession.session_type == "work",
            )
        )
        total_pomodoros = count_result.scalar() or 0
        await check_and_grant_achievements(db, user, {"pomodoro_count": total_pomodoros})

    await db.commit()
    await db.refresh(session)
    return session


@router.get("/stats")
async def pomodoro_stats(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    from datetime import date, timedelta
    today = date.today()

    today_result = await db.execute(
        select(func.count(PomodoroSession.id)).where(
            func.date(PomodoroSession.started_at) == today,
            PomodoroSession.completed.is_(True),
            PomodoroSession.session_type == "work",
        )
    )
    today_count = today_result.scalar() or 0

    total_result = await db.execute(
        select(func.count(PomodoroSession.id)).where(
            PomodoroSession.completed.is_(True),
            PomodoroSession.session_type == "work",
        )
    )
    total_count = total_result.scalar() or 0

    return {
        "today_sessions": today_count,
        "today_minutes": today_count * 25,
        "total_sessions": total_count,
        "total_minutes": total_count * 25,
    }
