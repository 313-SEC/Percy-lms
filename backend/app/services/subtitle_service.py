"""
Subtitle service — auto-generation via OpenAI Whisper.
Runs in a FastAPI BackgroundTask to avoid blocking the event loop.
"""
import uuid
from pathlib import Path

from app.config import get_settings

settings = get_settings()


def generate_subtitles_sync(video_path: str, content_id: int, language: str = "en") -> str | None:
    """
    Transcribe `video_path` with Whisper and write a VTT file.
    Returns the saved subtitle file path, or None on failure.
    This runs synchronously — call from a BackgroundTask or thread pool.
    """
    try:
        import whisper  # type: ignore
    except ImportError:
        return None

    try:
        model = whisper.load_model(settings.whisper_model)
        result = model.transcribe(video_path, language=language, task="transcribe")
    except Exception:
        return None

    vtt_content = _segments_to_vtt(result.get("segments", []))
    filename = f"{uuid.uuid4().hex}.vtt"
    dest = settings.storage_path / "subtitles" / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(vtt_content, encoding="utf-8")
    return str(dest)


def _segments_to_vtt(segments: list[dict]) -> str:
    """Convert Whisper segments to WebVTT format."""
    lines = ["WEBVTT", ""]
    for seg in segments:
        start = _fmt_time(seg["start"])
        end = _fmt_time(seg["end"])
        text = seg["text"].strip()
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def _fmt_time(seconds: float) -> str:
    """Format seconds as HH:MM:SS.mmm for VTT."""
    ms = int((seconds % 1) * 1000)
    s = int(seconds) % 60
    m = int(seconds // 60) % 60
    h = int(seconds // 3600)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def srt_to_vtt(srt_text: str) -> str:
    """Convert SRT subtitle text to WebVTT format."""
    lines = ["WEBVTT", ""]
    for block in srt_text.strip().split("\n\n"):
        parts = block.strip().splitlines()
        if len(parts) < 3:
            continue
        # parts[0] is sequence number — skip it
        timecode = parts[1].replace(",", ".")
        text = "\n".join(parts[2:])
        lines.append(timecode)
        lines.append(text)
        lines.append("")
    return "\n".join(lines)
