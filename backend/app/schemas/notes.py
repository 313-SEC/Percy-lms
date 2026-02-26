from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    body_markdown: str = Field("", max_length=100_000)
    content_id: Optional[int] = None
    course_id: Optional[int] = None
    video_timestamp_seconds: Optional[float] = Field(None, ge=0)


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=256)
    body_markdown: Optional[str] = Field(None, max_length=100_000)
    video_timestamp_seconds: Optional[float] = Field(None, ge=0)


class NoteResponse(BaseModel):
    id: int
    title: str
    body_markdown: str
    content_id: Optional[int]
    course_id: Optional[int]
    video_timestamp_seconds: Optional[float]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
