"""
Content management + HTTP range-request video streaming.
"""
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Content
from app.models.user import User
from app.schemas.course import ContentResponse, ContentUpdate
from app.services.file_service import delete_file
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/content", tags=["content"])

CHUNK_SIZE = 1024 * 1024  # 1 MB chunks


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.put("/{content_id}", response_model=ContentResponse)
async def update_content(
    content_id: int,
    body: ContentUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(content, field, value)

    await db.commit()
    await db.refresh(content)
    return content


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    delete_file(content.file_path)
    await db.delete(content)
    await db.commit()


@router.get("/{content_id}/stream")
async def stream_content(
    content_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Serve video/document with HTTP Range support.
    The file path is validated to be within the storage directory
    before streaming — path traversal is not possible.
    """
    from app.config import get_settings
    settings = get_settings()

    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content or not content.file_path:
        raise HTTPException(status_code=404, detail="Content not found")

    file_path = Path(content.file_path)
    # Security: ensure file is inside storage directory
    try:
        file_path.resolve().relative_to(settings.storage_path.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    # Determine content type based on file extension
    import mimetypes
    mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"

    if range_header:
        # Parse "bytes=start-end"
        try:
            range_val = range_header.replace("bytes=", "")
            start_str, end_str = range_val.split("-")
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
        except ValueError:
            raise HTTPException(status_code=416, detail="Invalid Range header")

        if start > end or end >= file_size:
            raise HTTPException(status_code=416, detail="Range Not Satisfiable")

        chunk_size = end - start + 1

        def _iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(CHUNK_SIZE, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            _iter_file(),
            status_code=206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Type": mime_type,
            },
        )

    # Full file
    def _iter_full():
        with open(file_path, "rb") as f:
            while chunk := f.read(CHUNK_SIZE):
                yield chunk

    return StreamingResponse(
        _iter_full(),
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": mime_type,
        },
    )
