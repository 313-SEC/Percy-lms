"""Notes router — CRUD with markdown sanitization."""
import bleach
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.learning import Note
from app.models.user import User
from app.schemas.notes import NoteCreate, NoteResponse, NoteUpdate
from app.services.gamification_service import XP_NOTE_CREATED, award_xp
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/notes", tags=["notes"])

# Allowed HTML tags/attributes for markdown-rendered content
ALLOWED_TAGS = list(bleach.sanitizer.ALLOWED_TAGS) + ["h1", "h2", "h3", "h4", "pre", "code", "p", "br"]
ALLOWED_ATTRS = {"*": ["class"]}


def _sanitise(md: str) -> str:
    """Sanitise Markdown body. We store raw markdown; sanitise before any HTML rendering."""
    # For storage we keep it as-is but strip dangerous patterns
    return bleach.clean(md, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=False)


@router.get("", response_model=list[NoteResponse])
async def list_notes(
    content_id: int | None = Query(None),
    course_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Note).order_by(Note.updated_at.desc())
    if content_id is not None:
        query = query.where(Note.content_id == content_id)
    if course_id is not None:
        query = query.where(Note.course_id == course_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = body.model_dump()
    data["body_markdown"] = _sanitise(data["body_markdown"])
    note = Note(**data)
    db.add(note)

    await award_xp(db, user, "note_created", XP_NOTE_CREATED, "Created a note")
    await db.commit()
    await db.refresh(note)
    return note


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    body: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    data = body.model_dump(exclude_none=True)
    if "body_markdown" in data:
        data["body_markdown"] = _sanitise(data["body_markdown"])

    for field, value in data.items():
        setattr(note, field, value)

    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()


@router.get("/export/{note_id}")
async def export_note_markdown(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Note).where(Note.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    from app.services.export_service import note_to_markdown
    content = note_to_markdown({
        "title": note.title,
        "body_markdown": note.body_markdown,
        "created_at": note.created_at.strftime("%Y-%m-%d"),
        "video_timestamp_seconds": note.video_timestamp_seconds,
    })

    return Response(
        content=content.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{note.title[:50]}.md"'},
    )
