"""
Gamification service: XP awards, level calculation, achievements, streaks.
All XP changes go through award_xp() to keep accounting consistent.
"""
import math
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import Achievement, DailyStreak, XPEvent
from app.models.user import User, UserStats

# ── XP constants ──────────────────────────────────────────────────────────────
XP_VIDEO_MINUTE = 1
XP_CONTENT_COMPLETE = 10
XP_MODULE_COMPLETE = 25
XP_COURSE_COMPLETE = 100
XP_NOTE_CREATED = 5
XP_POMODORO_COMPLETE = 15
XP_DAILY_LOGIN = 5
XP_STREAK_7 = 50
XP_STREAK_30 = 200

# ── Level formula ─────────────────────────────────────────────────────────────

def xp_for_level(level: int) -> int:
    """Total XP required to *reach* `level`."""
    return math.ceil(100 * (level ** 1.5))


def level_from_xp(total_xp: int) -> int:
    """Compute level from total XP (minimum 1)."""
    level = 1
    while xp_for_level(level + 1) <= total_xp:
        level += 1
    return level


def xp_progress(total_xp: int) -> tuple[int, int]:
    """Returns (xp_earned_in_current_level, xp_needed_for_next_level)."""
    lvl = level_from_xp(total_xp)
    floor = xp_for_level(lvl)
    ceiling = xp_for_level(lvl + 1)
    return total_xp - floor, ceiling - floor


# ── Known achievements ────────────────────────────────────────────────────────
ACHIEVEMENTS: dict[str, dict] = {
    "first_video": {"title": "First Frame", "description": "Watch your first video", "icon": "play_circle"},
    "note_taker_10": {"title": "Note Taker", "description": "Create 10 notes", "icon": "edit_note"},
    "pomodoro_5": {"title": "Tomato Fan", "description": "Complete 5 Pomodoro sessions", "icon": "timer"},
    "streak_7": {"title": "One Week Streak", "description": "Study 7 days in a row", "icon": "local_fire_department"},
    "streak_30": {"title": "Monthly Warrior", "description": "Study 30 days in a row", "icon": "bolt"},
    "course_complete": {"title": "Graduate", "description": "Complete your first course", "icon": "school"},
    "night_owl": {"title": "Night Owl", "description": "Study between midnight and 5 AM", "icon": "nightlight"},
    "bookworm": {"title": "Bookworm", "description": "Upload 50+ documents", "icon": "menu_book"},
    "speed_runner": {"title": "Speed Runner", "description": "Complete a course in a single day", "icon": "speed"},
    "xp_1000": {"title": "1K XP Club", "description": "Earn 1,000 total XP", "icon": "stars"},
    "xp_10000": {"title": "10K Elite", "description": "Earn 10,000 total XP", "icon": "military_tech"},
}


async def _get_or_create_stats(db: AsyncSession, user: User) -> UserStats:
    if user.stats:
        return user.stats
    stats = UserStats(user_id=user.id)
    db.add(stats)
    await db.flush()
    return stats


async def award_xp(
    db: AsyncSession,
    user: User,
    event_type: str,
    xp: int,
    description: str,
) -> UserStats:
    """Add XP, update level, persist XPEvent. Returns updated stats."""
    stats = await _get_or_create_stats(db, user)
    stats.total_xp += xp
    stats.level = level_from_xp(stats.total_xp)

    event = XPEvent(event_type=event_type, xp_amount=xp, description=description)
    db.add(event)

    await _update_streak(db, stats)
    await db.flush()
    return stats


async def _update_streak(db: AsyncSession, stats: UserStats) -> None:
    today = date.today()
    if stats.last_activity_date == today:
        return  # Already recorded today

    result = await db.execute(
        select(DailyStreak).where(DailyStreak.date == today)
    )
    streak_row = result.scalar_one_or_none()
    if not streak_row:
        db.add(DailyStreak(date=today, minutes_studied=0, sessions_completed=0))

    yesterday = today - timedelta(days=1)
    if stats.last_activity_date == yesterday:
        stats.current_streak += 1
    else:
        stats.current_streak = 1

    if stats.current_streak > stats.longest_streak:
        stats.longest_streak = stats.current_streak

    stats.last_activity_date = today


async def check_and_grant_achievements(
    db: AsyncSession,
    user: User,
    context: dict,
) -> list[Achievement]:
    """Check if user qualifies for new achievements. Returns newly earned ones."""
    stats = await _get_or_create_stats(db, user)
    earned: list[Achievement] = []

    async def _grant(key: str) -> None:
        existing = await db.execute(
            select(Achievement).where(Achievement.achievement_key == key)
        )
        if existing.scalar_one_or_none():
            return  # Already earned
        meta = ACHIEVEMENTS[key]
        ach = Achievement(
            achievement_key=key,
            title=meta["title"],
            description=meta["description"],
            icon_name=meta["icon"],
        )
        db.add(ach)
        earned.append(ach)

    if context.get("video_watched") and stats.total_xp >= XP_VIDEO_MINUTE:
        await _grant("first_video")

    if context.get("note_count", 0) >= 10:
        await _grant("note_taker_10")

    if context.get("pomodoro_count", 0) >= 5:
        await _grant("pomodoro_5")

    if stats.current_streak >= 7:
        await _grant("streak_7")

    if stats.current_streak >= 30:
        await _grant("streak_30")

    if context.get("course_completed"):
        await _grant("course_complete")

    if context.get("night_owl"):
        await _grant("night_owl")

    if context.get("document_count", 0) >= 50:
        await _grant("bookworm")

    if context.get("course_completed_today"):
        await _grant("speed_runner")

    if stats.total_xp >= 1000:
        await _grant("xp_1000")

    if stats.total_xp >= 10_000:
        await _grant("xp_10000")

    await db.flush()
    return earned
