"""Subtitle upload, auto-generation (Whisper), and serving."""
import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Content
from app.models.learning import Subtitle
from app.models.user import User
from app.schemas.gamification import SubtitleResponse
from app.services.file_service import save_upload
from app.services.subtitle_service import generate_subtitles_sync, srt_to_vtt
from app.utils.deps import get_current_user, get_db
from app.config import get_settings

router = APIRouter(prefix="/subtitles", tags=["subtitles"])
settings = get_settings()


@router.get("/{content_id}", response_model=list[SubtitleResponse])
async def list_subtitles(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Subtitle).where(Subtitle.content_id == content_id)
    )
    return result.scalars().all()


@router.post("/{content_id}/upload", response_model=SubtitleResponse, status_code=status.HTTP_201_CREATED)
async def upload_subtitle(
    content_id: int,
    language_code: str = Form("en"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    res = await db.execute(select(Content).where(Content.id == content_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Content not found")

    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, file.file.read)

    # Determine format from extension
    original_name = file.filename or ""
    is_srt = original_name.lower().endswith(".srt")

    try:
        file_path, _ = save_upload(data, original_name, "subtitle")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Convert SRT → VTT if needed
    if is_srt:
        vtt_content = srt_to_vtt(data.decode("utf-8", errors="replace"))
        dest = Path(file_path).with_suffix(".vtt")
        dest.write_text(vtt_content, encoding="utf-8")
        Path(file_path).unlink(missing_ok=True)
        file_path = str(dest)

    subtitle = Subtitle(
        content_id=content_id,
        language_code=language_code.strip()[:8],
        file_path=file_path,
        is_auto_generated=False,
    )
    db.add(subtitle)
    await db.commit()
    await db.refresh(subtitle)
    return subtitle


@router.post("/{content_id}/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_subtitle(
    content_id: int,
    background_tasks: BackgroundTasks,
    language_code: str = "en",
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Trigger Whisper auto-transcription in a background task."""
    res = await db.execute(select(Content).where(Content.id == content_id))
    content = res.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content.file_path:
        raise HTTPException(status_code=422, detail="Content has no associated file")

    # We pass the DB session factory — background task creates its own session
    background_tasks.add_task(
        _run_whisper_and_save,
        content_id=content_id,
        video_path=content.file_path,
        language_code=language_code,
    )
    return {"detail": "Subtitle generation started. Check back shortly."}


async def _run_whisper_and_save(content_id: int, video_path: str, language_code: str) -> None:
    """Background task: run Whisper and save result to DB."""
    from app.database import AsyncSessionLocal

    loop = asyncio.get_event_loop()
    vtt_path = await loop.run_in_executor(
        None, generate_subtitles_sync, video_path, content_id, language_code
    )
    if not vtt_path:
        return  # Whisper not installed or failed — silently skip

    async with AsyncSessionLocal() as db:
        subtitle = Subtitle(
            content_id=content_id,
            language_code=language_code,
            file_path=vtt_path,
            is_auto_generated=True,
        )
        db.add(subtitle)
        await db.commit()


@router.delete("/{subtitle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subtitle(
    subtitle_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Subtitle).where(Subtitle.id == subtitle_id))
    subtitle = result.scalar_one_or_none()
    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitle not found")

    from app.services.file_service import delete_file
    delete_file(subtitle.file_path)
    await db.delete(subtitle)
    await db.commit()


@router.get("/{subtitle_id}/serve")
async def serve_subtitle(
    subtitle_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Subtitle).where(Subtitle.id == subtitle_id))
    subtitle = result.scalar_one_or_none()
    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitle not found")

    path = Path(subtitle.file_path)
    # Security: only serve files inside storage directory
    try:
        path.resolve().relative_to(settings.storage_path.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not path.exists():
        raise HTTPException(status_code=404, detail="Subtitle file not found on disk")

    return FileResponse(path, media_type="text/vtt")
