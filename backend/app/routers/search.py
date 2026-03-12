"""Full-text search across courses, content, and notes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.course import Content, Course, Module
from app.models.learning import Note
from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/search", tags=["search"])

@router.get("")
async def search(q: str = Query(..., min_length=1), db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    term = f"%{q}%"

    courses_result = await db.execute(
        select(Course).where(Course.title.ilike(term) | Course.description.ilike(term)).limit(10)
    )
    courses = [{"id": c.id, "title": c.title, "description": c.description, "color": c.color}
               for c in courses_result.scalars().all()]

    content_result = await db.execute(
        select(Content, Module).join(Module, Content.module_id == Module.id)
        .where(Content.title.ilike(term)).limit(10)
    )
    content = [{"id": c.id, "title": c.title, "content_type": c.content_type,
                "module_id": c.module_id, "module_title": m.title, "course_id": m.course_id}
               for c, m in content_result.all()]

    notes_result = await db.execute(
        select(Note).where(Note.title.ilike(term) | Note.body_markdown.ilike(term)).limit(10)
    )
    notes = [{"id": n.id, "title": n.title, "body_preview": n.body_markdown[:200],
              "content_id": n.content_id, "course_id": n.course_id, "updated_at": n.updated_at.isoformat()}
             for n in notes_result.scalars().all()]

    return {"query": q, "courses": courses, "content": content, "notes": notes}
