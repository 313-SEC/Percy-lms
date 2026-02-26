"""Course, Module, and Content models."""
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ContentType(str, Enum):
    video = "video"
    pdf = "pdf"
    document = "document"
    link = "link"


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    color: Mapped[str] = mapped_column(String(7), default="#00ffff", nullable=False)  # hex
    thumbnail_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    modules: Mapped[list["Module"]] = relationship(
        "Module", back_populates="course", cascade="all, delete-orphan",
        order_by="Module.order_index"
    )


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course_id: Mapped[int] = mapped_column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    contents: Mapped[list["Content"]] = relationship(
        "Content", back_populates="module", cascade="all, delete-orphan",
        order_by="Content.order_index"
    )


class Content(Base):
    __tablename__ = "contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    content_type: Mapped[str] = mapped_column(String(16), nullable=False)  # ContentType enum value
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    module: Mapped["Module"] = relationship("Module", back_populates="contents")
    progress: Mapped["VideoProgress | None"] = relationship(  # type: ignore[name-defined]
        "VideoProgress", back_populates="content", uselist=False, cascade="all, delete-orphan"
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(  # type: ignore[name-defined]
        "Bookmark", back_populates="content", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(  # type: ignore[name-defined]
        "Note", back_populates="content", cascade="all, delete-orphan"
    )
    subtitles: Mapped[list["Subtitle"]] = relationship(  # type: ignore[name-defined]
        "Subtitle", back_populates="content", cascade="all, delete-orphan"
    )
