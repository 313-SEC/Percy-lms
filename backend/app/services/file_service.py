"""
Secure file upload service.
- Detects real MIME type via python-magic (not Content-Type header)
- Stores files with UUID names — user-supplied names never touch the filesystem
- Validates file size before writing
"""
import mimetypes
import uuid
from pathlib import Path
from typing import IO

import magic

from app.config import get_settings

settings = get_settings()

# Allowed MIME types per category
ALLOWED_VIDEO_MIMES: set[str] = {
    "video/mp4", "video/webm", "video/ogg", "video/x-msvideo",
    "video/x-matroska", "video/quicktime", "video/mpeg",
}

ALLOWED_DOCUMENT_MIMES: set[str] = {
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
}

ALLOWED_SUBTITLE_MIMES: set[str] = {
    "text/plain",
    "text/vtt",
    "application/octet-stream",  # some SRT files come through as this
}

# Extension → storage sub-directory
_MIME_TO_SUBDIR = {
    **{m: "videos" for m in ALLOWED_VIDEO_MIMES},
    **{m: "documents" for m in ALLOWED_DOCUMENT_MIMES},
}


def _detect_mime(data: bytes) -> str:
    """Use libmagic (not Content-Type header) to detect real MIME type."""
    return magic.from_buffer(data, mime=True)


def _safe_extension(filename: str, mime: str) -> str:
    """Return a safe file extension based on MIME type, not user filename."""
    ext_from_mime = mimetypes.guess_extension(mime, strict=False) or ""
    # Some MIME → extension mappings are unfortunate; override common ones.
    overrides = {
        ".ksh": ".txt",
        ".bat": ".txt",
        None: "",
    }
    ext = overrides.get(ext_from_mime, ext_from_mime)
    if not ext:
        # Fall back to the original extension but only allow safe chars
        original = Path(filename).suffix.lower()
        if original and original.replace(".", "").isalnum() and len(original) <= 6:
            ext = original
    return ext


def save_upload(
    file_data: bytes,
    original_filename: str,
    category: str,  # "video" | "document" | "subtitle"
) -> tuple[str, str]:
    """
    Validate and save an uploaded file.

    Returns (relative_file_path, detected_mime).
    Raises ValueError on validation failure.
    """
    if category == "video":
        allowed = ALLOWED_VIDEO_MIMES
        max_bytes = settings.max_video_bytes
        subdir = "videos"
    elif category == "document":
        allowed = ALLOWED_DOCUMENT_MIMES
        max_bytes = settings.max_document_bytes
        subdir = "documents"
    elif category == "subtitle":
        allowed = ALLOWED_SUBTITLE_MIMES
        max_bytes = 10 * 1024 * 1024  # 10 MB cap for subtitle files
        subdir = "subtitles"
    else:
        raise ValueError(f"Unknown upload category: {category!r}")

    if len(file_data) == 0:
        raise ValueError("Uploaded file is empty")

    if len(file_data) > max_bytes:
        raise ValueError(
            f"File too large: {len(file_data) // (1024*1024)} MiB "
            f"(max {max_bytes // (1024*1024)} MiB)"
        )

    mime = _detect_mime(file_data)
    if mime not in allowed:
        raise ValueError(f"File type not permitted: {mime!r}")

    ext = _safe_extension(original_filename, mime)
    filename = uuid.uuid4().hex + ext
    dest: Path = settings.storage_path / subdir / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(file_data)

    return str(dest), mime


def delete_file(file_path: str | None) -> None:
    """Delete a stored file if it exists. Silently ignores missing files."""
    if not file_path:
        return
    path = Path(file_path)
    # Safety: only delete files inside the storage directory
    try:
        path.resolve().relative_to(settings.storage_path.resolve())
    except ValueError:
        return  # path escape attempt — ignore
    if path.exists() and path.is_file():
        path.unlink()
