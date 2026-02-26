"""Tests for course CRUD and reordering."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_courses_empty(authed_client: AsyncClient):
    res = await authed_client.get("/api/courses")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_create_course(authed_client: AsyncClient):
    res = await authed_client.post("/api/courses", json={"title": "Test Course", "color": "#00ffff"})
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Test Course"
    assert data["color"] == "#00ffff"
    assert data["id"] > 0


@pytest.mark.asyncio
async def test_create_course_invalid_color(authed_client: AsyncClient):
    res = await authed_client.post("/api/courses", json={"title": "Bad", "color": "red"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_get_course(authed_client: AsyncClient):
    create = await authed_client.post("/api/courses", json={"title": "Fetchable", "color": "#9d00ff"})
    course_id = create.json()["id"]

    res = await authed_client.get(f"/api/courses/{course_id}")
    assert res.status_code == 200
    assert res.json()["title"] == "Fetchable"


@pytest.mark.asyncio
async def test_update_course(authed_client: AsyncClient):
    create = await authed_client.post("/api/courses", json={"title": "Original", "color": "#00ffff"})
    course_id = create.json()["id"]

    res = await authed_client.put(f"/api/courses/{course_id}", json={"title": "Updated"})
    assert res.status_code == 200
    assert res.json()["title"] == "Updated"


@pytest.mark.asyncio
async def test_delete_course(authed_client: AsyncClient):
    create = await authed_client.post("/api/courses", json={"title": "ToDelete", "color": "#ff003c"})
    course_id = create.json()["id"]

    del_res = await authed_client.delete(f"/api/courses/{course_id}")
    assert del_res.status_code == 204

    get_res = await authed_client.get(f"/api/courses/{course_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_create_module(authed_client: AsyncClient):
    course = await authed_client.post("/api/courses", json={"title": "C", "color": "#00ffff"})
    course_id = course.json()["id"]

    res = await authed_client.post(f"/api/courses/{course_id}/modules", json={"title": "Module 1"})
    assert res.status_code == 201
    assert res.json()["title"] == "Module 1"
    assert res.json()["course_id"] == course_id


@pytest.mark.asyncio
async def test_reorder_courses(authed_client: AsyncClient):
    c1 = (await authed_client.post("/api/courses", json={"title": "C1", "color": "#00ffff"})).json()
    c2 = (await authed_client.post("/api/courses", json={"title": "C2", "color": "#9d00ff"})).json()

    res = await authed_client.post("/api/courses/reorder", json={"ids": [c2["id"], c1["id"]]})
    assert res.status_code == 204
