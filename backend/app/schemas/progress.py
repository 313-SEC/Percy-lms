from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProgressUpdate(BaseModel):
    position_seconds: float = Field(..., ge=0)
    completed: bool = False
    watch_seconds_delta: float = Field(0.0, ge=0)


class ProgressResponse(BaseModel):
    content_id: int
    last_position_seconds: float
    completed: bool
    last_watched_at: datetime
    total_watch_seconds: float

    model_config = {"from_attributes": True}


class BookmarkCreate(BaseModel):
    timestamp_seconds: float = Field(..., ge=0)
    label: str = Field(..., min_length=1, max_length=256)
    note_text: Optional[str] = Field(None, max_length=2048)


class BookmarkResponse(BaseModel):
    id: int
    content_id: int
    timestamp_seconds: float
    label: str
    note_text: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PomodoroStart(BaseModel):
    session_type: str = Field("work", pattern="^(work|short_break|long_break)$")
    duration_minutes: int = Field(25, ge=1, le=120)
    content_id: Optional[int] = None


class PomodoroEnd(BaseModel):
    completed: bool = True


class PomodoroResponse(BaseModel):
    id: int
    session_type: str
    duration_minutes: int
    started_at: datetime
    ended_at: Optional[datetime]
    completed: bool

    model_config = {"from_attributes": True}
