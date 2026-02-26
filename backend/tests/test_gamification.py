"""Tests for gamification — XP awards, level calculation, achievements."""
import pytest
from app.services.gamification_service import level_from_xp, xp_for_level, xp_progress


def test_level_from_xp_baseline():
    assert level_from_xp(0) == 1
    assert level_from_xp(99) == 1


def test_level_from_xp_level_2():
    threshold = xp_for_level(2)
    assert level_from_xp(threshold) == 2
    assert level_from_xp(threshold - 1) == 1


def test_level_increases_monotonically():
    prev = 0
    for xp in range(0, 5001, 100):
        lvl = level_from_xp(xp)
        assert lvl >= prev
        prev = lvl


def test_xp_for_level_increases():
    thresholds = [xp_for_level(n) for n in range(1, 20)]
    assert thresholds == sorted(thresholds)


def test_xp_progress_within_level():
    for total_xp in [0, 50, 150, 500, 1500]:
        in_level, to_next = xp_progress(total_xp)
        assert in_level >= 0
        assert to_next > 0
        assert in_level <= to_next


@pytest.mark.asyncio
async def test_pomodoro_stats_endpoint(authed_client):
    res = await authed_client.get("/api/pomodoro/stats")
    assert res.status_code == 200
    data = res.json()
    assert "today_sessions" in data
    assert "total_sessions" in data


@pytest.mark.asyncio
async def test_achievements_list(authed_client):
    res = await authed_client.get("/api/gamification/achievements")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_xp_history(authed_client):
    res = await authed_client.get("/api/gamification/history?limit=10")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
