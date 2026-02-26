"""
Secure file upload router.
Files are validated by actual MIME detection before storage.
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Content, ContentType, Module
from app.models.user import User
from app.schemas.course import ContentResponse
from app.services.file_service import save_upload
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/upload", tags=["upload"])


async def _read_upload(file: UploadFile) -> bytes:
    """Read upload in a thread-pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, file.file.read)


@router.post("/video", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    module_id: int = Form(...),
    title: str = Form(..., min_length=1, max_length=256),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Module not found")

    data = await _read_upload(file)
    try:
        file_path, _ = save_upload(data, file.filename or "video", "video")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    # Get next order index
    existing = await db.execute(
        select(Content).where(Content.module_id == module_id).order_by(Content.order_index.desc()).limit(1)
    )
    last = existing.scalar_one_or_none()
    order = (last.order_index + 1) if last else 0

    content = Content(
        module_id=module_id,
        title=title.strip(),
        content_type=ContentType.video,
        file_path=file_path,
        order_index=order,
    )
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return content


@router.post("/document", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    module_id: int = Form(...),
    title: str = Form(..., min_length=1, max_length=256),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Module).where(Module.id == module_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Module not found")

    data = await _read_upload(file)
    try:
        file_path, _ = save_upload(data, file.filename or "document", "document")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    existing = await db.execute(
        select(Content).where(Content.module_id == module_id).order_by(Content.order_index.desc()).limit(1)
    )
    last = existing.scalar_one_or_none()
    order = (last.order_index + 1) if last else 0

    content = Content(
        module_id=module_id,
        title=title.strip(),
        content_type=ContentType.pdf,
        file_path=file_path,
        order_index=order,
    )
    db.add(content)
    await db.commit()
    await db.refresh(content)
    return content
