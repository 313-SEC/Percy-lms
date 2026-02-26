import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _valid_hex_color(v: str) -> str:
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", v):
        raise ValueError("color must be a 6-digit hex code like #00ffff")
    return v.lower()


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=4096)
    category: Optional[str] = Field(None, max_length=128)
    color: str = Field("#00ffff", max_length=7)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        return _valid_hex_color(v)


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=4096)
    category: Optional[str] = Field(None, max_length=128)
    color: Optional[str] = Field(None, max_length=7)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        return _valid_hex_color(v) if v else v


class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category: Optional[str]
    color: str
    thumbnail_path: Optional[str]
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=2048)


class ModuleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=256)
    description: Optional[str] = Field(None, max_length=2048)


class ModuleResponse(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    order_index: int

    model_config = {"from_attributes": True}


class ReorderRequest(BaseModel):
    """List of IDs in desired order."""
    ids: list[int] = Field(..., min_length=0)


class ContentResponse(BaseModel):
    id: int
    module_id: int
    title: str
    content_type: str
    file_path: Optional[str]
    url: Optional[str]
    duration_seconds: Optional[float]
    order_index: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=256)
    url: Optional[str] = Field(None, max_length=2048)
