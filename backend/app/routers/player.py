"""
Video progress tracking and bookmarks router.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Content
from app.models.learning import Bookmark
from app.models.progress import VideoProgress
from app.models.user import User
from app.schemas.progress import BookmarkCreate, BookmarkResponse, ProgressResponse, ProgressUpdate
from app.services.gamification_service import XP_CONTENT_COMPLETE, XP_VIDEO_MINUTE, award_xp
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/player", tags=["player"])


@router.get("/{content_id}/progress", response_model=ProgressResponse)
async def get_progress(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VideoProgress).where(VideoProgress.content_id == content_id)
    )
    prog = result.scalar_one_or_none()
    if not prog:
        # Return empty progress
        return ProgressResponse(
            content_id=content_id,
            last_position_seconds=0.0,
            completed=False,
            last_watched_at=datetime.now(timezone.utc),
            total_watch_seconds=0.0,
        )
    return prog


@router.post("/{content_id}/progress", response_model=ProgressResponse)
async def update_progress(
    content_id: int,
    body: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify content exists
    res = await db.execute(select(Content).where(Content.id == content_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Content not found")

    result = await db.execute(
        select(VideoProgress).where(VideoProgress.content_id == content_id)
    )
    prog = result.scalar_one_or_none()

    was_completed = prog.completed if prog else False

    if not prog:
        prog = VideoProgress(content_id=content_id)
        db.add(prog)

    prog.last_position_seconds = body.position_seconds
    prog.total_watch_seconds += body.watch_seconds_delta

    if body.completed and not was_completed:
        prog.completed = True
        await award_xp(db, user, "content_complete", XP_CONTENT_COMPLETE, "Completed a lesson")

    # Award XP for watch time (per minute delta)
    minutes_delta = int(body.watch_seconds_delta // 60)
    if minutes_delta > 0:
        await award_xp(db, user, "video_watched", minutes_delta * XP_VIDEO_MINUTE, f"Watched {minutes_delta} minute(s)")

    await db.commit()
    await db.refresh(prog)
    return prog


# ── Bookmarks ─────────────────────────────────────────────────────────────────

@router.get("/{content_id}/bookmarks", response_model=list[BookmarkResponse])
async def list_bookmarks(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Bookmark)
        .where(Bookmark.content_id == content_id)
        .order_by(Bookmark.timestamp_seconds)
    )
    return result.scalars().all()


@router.post("/{content_id}/bookmarks", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    content_id: int,
    body: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    res = await db.execute(select(Content).where(Content.id == content_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Content not found")

    bookmark = Bookmark(content_id=content_id, **body.model_dump())
    db.add(bookmark)
    await db.commit()
    await db.refresh(bookmark)
    return bookmark


@router.delete("/bookmarks/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Bookmark).where(Bookmark.id == bookmark_id))
    bookmark = result.scalar_one_or_none()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    await db.delete(bookmark)
    await db.commit()
