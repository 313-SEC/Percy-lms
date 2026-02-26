"""Export router — notes as Markdown or PDF for NotebookLM."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.learning import Note
from app.models.user import User
from app.services.export_service import notes_to_markdown, save_markdown, save_pdf
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/export", tags=["export"])


class BulkExportRequest(BaseModel):
    note_ids: list[int]
    title: str = "Percy LMS — Exported Notes"
    format: str = "markdown"  # "markdown" | "pdf"


def _note_to_dict(note: Note) -> dict:
    return {
        "title": note.title,
        "body_markdown": note.body_markdown,
        "created_at": note.created_at.strftime("%Y-%m-%d"),
        "video_timestamp_seconds": note.video_timestamp_seconds,
    }


@router.post("/notes/bulk")
async def bulk_export(
    body: BulkExportRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if body.format not in ("markdown", "pdf"):
        raise HTTPException(status_code=422, detail="format must be 'markdown' or 'pdf'")

    result = await db.execute(
        select(Note).where(Note.id.in_(body.note_ids)).order_by(Note.updated_at.desc())
    )
    notes = result.scalars().all()
    if not notes:
        raise HTTPException(status_code=404, detail="No notes found")

    note_dicts = [_note_to_dict(n) for n in notes]
    md_content = notes_to_markdown(note_dicts, title=body.title)

    if body.format == "pdf":
        path = save_pdf(md_content, prefix="notes_export")
        if not path:
            raise HTTPException(
                status_code=501,
                detail="PDF export requires WeasyPrint to be installed",
            )
        return FileResponse(path, media_type="application/pdf", filename="percy_notes.pdf")

    # Default: Markdown
    return Response(
        content=md_content.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": 'attachment; filename="percy_notes.md"'},
    )


@router.post("/course/{course_id}")
async def export_course_notes(
    course_id: int,
    fmt: str = "markdown",
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if fmt not in ("markdown", "pdf"):
        raise HTTPException(status_code=422, detail="fmt must be 'markdown' or 'pdf'")

    result = await db.execute(
        select(Note)
        .where(Note.course_id == course_id)
        .order_by(Note.updated_at.desc())
    )
    notes = result.scalars().all()

    note_dicts = [_note_to_dict(n) for n in notes]
    md_content = notes_to_markdown(note_dicts, title=f"Course #{course_id} Notes")

    if fmt == "pdf":
        path = save_pdf(md_content, prefix=f"course_{course_id}")
        if not path:
            raise HTTPException(status_code=501, detail="WeasyPrint not installed")
        return FileResponse(path, media_type="application/pdf")

    return Response(
        content=md_content.encode("utf-8"),
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="course_{course_id}_notes.md"'},
    )
