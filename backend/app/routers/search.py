"""Full-text search across courses, notes, and content."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Content, Course, Module
from app.models.learning import Note
from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(..., min_length=1, max_length=256),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Search courses, notes, and content items by keyword."""
    term = f"%{q}%"

    # Search courses
    course_result = await db.execute(
        select(Course).where(
            or_(
                Course.title.ilike(term),
                Course.description.ilike(term),
                Course.category.ilike(term),
            )
        ).limit(20)
    )
    courses = course_result.scalars().all()

    # Search content (video, pdf, link, document titles)
    content_result = await db.execute(
        select(Content, Module).join(Module, Content.module_id == Module.id).where(
            Content.title.ilike(term)
        ).limit(20)
    )
    content_rows = content_result.all()

    # Search notes by title and body
    note_result = await db.execute(
        select(Note).where(
            or_(
                Note.title.ilike(term),
                Note.body_markdown.ilike(term),
            )
        ).limit(20)
    )
    notes = note_result.scalars().all()

    return {
        "query": q,
        "courses": [
            {"id": c.id, "title": c.title, "description": c.description, "color": c.color}
            for c in courses
        ],
        "content": [
            {
                "id": c.id,
                "title": c.title,
                "content_type": c.content_type,
                "module_id": c.module_id,
                "module_title": m.title,
                "course_id": m.course_id,
            }
            for c, m in content_rows
        ],
        "notes": [
            {
                "id": n.id,
                "title": n.title,
                "body_preview": n.body_markdown[:200],
                "content_id": n.content_id,
                "course_id": n.course_id,
                "updated_at": n.updated_at.isoformat(),
            }
            for n in notes
        ],
    }
