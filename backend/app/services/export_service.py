"""
Export service — generate Markdown and PDF files for NotebookLM integration.
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_settings

settings = get_settings()


def _header(title: str, meta: str) -> str:
    return f"# {title}\n\n_{meta}_\n\n---\n\n"


def note_to_markdown(note_data: dict) -> str:
    ts = note_data.get("video_timestamp_seconds")
    timestamp_str = f" (at {_fmt_ts(ts)})" if ts is not None else ""
    return (
        _header(note_data["title"], f"Created {note_data['created_at']}{timestamp_str}")
        + note_data["body_markdown"]
    )


def notes_to_markdown(notes: list[dict], title: str = "Percy LMS — Exported Notes") -> str:
    parts = [f"# {title}\n\n_Exported from Percy LMS on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}_\n\n---\n\n"]
    for note in notes:
        ts = note.get("video_timestamp_seconds")
        timestamp_str = f" (at {_fmt_ts(ts)})" if ts is not None else ""
        parts.append(f"## {note['title']}{timestamp_str}\n\n")
        parts.append(note["body_markdown"])
        parts.append("\n\n---\n\n")
    return "".join(parts)


def save_markdown(content: str, prefix: str = "export") -> str:
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.md"
    dest = settings.storage_path / "exports" / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding="utf-8")
    return str(dest)


def save_pdf(markdown_content: str, prefix: str = "export") -> str | None:
    """Convert Markdown to PDF. Returns file path or None if WeasyPrint unavailable."""
    try:
        import markdown as md_lib
        from weasyprint import HTML
    except ImportError:
        return None

    html_body = md_lib.markdown(markdown_content, extensions=["tables", "fenced_code"])
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: sans-serif; margin: 40px; line-height: 1.6; color: #1a1a1a; }}
  h1, h2, h3 {{ color: #1a237e; }}
  code {{ background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }}
  pre {{ background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }}
  hr {{ border: none; border-top: 2px solid #e0e0e0; margin: 24px 0; }}
</style>
</head>
<body>{html_body}</body>
</html>"""

    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.pdf"
    dest = settings.storage_path / "exports" / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    HTML(string=html).write_pdf(str(dest))
    return str(dest)


def _fmt_ts(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}:{s:02d}"
