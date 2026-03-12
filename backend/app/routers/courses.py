"""
Course, Module, and Content CRUD + reordering.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Content, Course, Module
from app.models.user import User
from app.schemas.course import (
    ContentResponse, ContentUpdate, CourseCreate, CourseResponse, CourseUpdate,
    ModuleCreate, ModuleResponse, ModuleUpdate, ReorderRequest,
)
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/courses", tags=["courses"])


# ── Courses ───────────────────────────────────────────────────────────────────

@router.get("", response_model=List[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).order_by(Course.order_index))
    return result.scalars().all()


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).order_by(Course.order_index.desc()).limit(1))
    last = result.scalar_one_or_none()
    order = (last.order_index + 1) if last else 0

    course = Course(**body.model_dump(), order_index=order)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(
            selectinload(Course.modules).selectinload(Module.contents)
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    body: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.delete(course)
    await db.commit()


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_courses(
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    for idx, course_id in enumerate(body.ids):
        result = await db.execute(select(Course).where(Course.id == course_id))
        course = result.scalar_one_or_none()
        if course:
            course.order_index = idx
    await db.commit()


# ── Modules ───────────────────────────────────────────────────────────────────

@router.post("/{course_id}/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    course_id: int,
    body: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Course not found")

    # Next order index
    existing = await db.execute(
        select(Module).where(Module.course_id == course_id).order_by(Module.order_index.desc()).limit(1)
    )
    last = existing.scalar_one_or_none()
    order = (last.order_index + 1) if last else 0

    module = Module(course_id=course_id, order_index=order, **body.model_dump())
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


@router.put("/{course_id}/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    course_id: int,
    module_id: int,
    body: ModuleUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Module).where(Module.id == module_id, Module.course_id == course_id)
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(module, field, value)

    await db.commit()
    await db.refresh(module)
    return module


@router.delete("/{course_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    course_id: int,
    module_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Module).where(Module.id == module_id, Module.course_id == course_id)
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    await db.delete(module)
    await db.commit()


@router.post("/{course_id}/modules/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_modules(
    course_id: int,
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    for idx, module_id in enumerate(body.ids):
        result = await db.execute(
            select(Module).where(Module.id == module_id, Module.course_id == course_id)
        )
        module = result.scalar_one_or_none()
        if module:
            module.order_index = idx
    await db.commit()


# ── Content reordering ────────────────────────────────────────────────────────

@router.post("/modules/{module_id}/content/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_content(
    module_id: int,
    body: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    for idx, content_id in enumerate(body.ids):
        result = await db.execute(
            select(Content).where(Content.id == content_id, Content.module_id == module_id)
        )
        content = result.scalar_one_or_none()
        if content:
            content.order_index = idx
    await db.commit()


@router.get("/{course_id}/progress")
async def get_course_progress(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return completion statistics for a course, broken down by module."""
    from app.models.progress import VideoProgress

    course_result = await db.execute(select(Course).where(Course.id == course_id))
    if not course_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Course not found")

    modules_result = await db.execute(
        select(Module).where(Module.course_id == course_id).order_by(Module.order_index)
    )
    modules = modules_result.scalars().all()

    # Get all content ids for this course
    all_content_ids = []
    module_content_map: dict[int, list] = {}
    for mod in modules:
        content_result = await db.execute(
            select(Content).where(Content.module_id == mod.id).order_by(Content.order_index)
        )
        contents = content_result.scalars().all()
        module_content_map[mod.id] = contents
        all_content_ids.extend([c.id for c in contents])

    # Get progress for all content
    progress_result = await db.execute(
        select(VideoProgress).where(VideoProgress.content_id.in_(all_content_ids))
    )
    progress_map = {vp.content_id: vp.completed for vp in progress_result.scalars().all()}

    module_stats = []
    total_content = 0
    completed_content = 0

    for mod in modules:
        contents = module_content_map.get(mod.id, [])
        mod_total = len(contents)
        mod_completed = sum(1 for c in contents if progress_map.get(c.id, False))
        total_content += mod_total
        completed_content += mod_completed
        module_stats.append({
            "module_id": mod.id,
            "module_title": mod.title,
            "total_content": mod_total,
            "completed_content": mod_completed,
            "completion_pct": round(100.0 * mod_completed / mod_total, 1) if mod_total > 0 else 0.0,
        })

    return {
        "course_id": course_id,
        "total_content": total_content,
        "completed_content": completed_content,
        "completion_pct": round(100.0 * completed_content / total_content, 1) if total_content > 0 else 0.0,
        "modules": module_stats,
    }
