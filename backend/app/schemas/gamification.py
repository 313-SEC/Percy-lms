from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GamificationStats(BaseModel):
    total_xp: int
    level: int
    xp_in_level: int       # XP earned within current level
    xp_to_next_level: int  # XP needed to reach next level
    current_streak: int
    longest_streak: int
    total_study_minutes: float


class AchievementResponse(BaseModel):
    achievement_key: str
    title: str
    description: str
    icon_name: str
    earned_at: datetime

    model_config = {"from_attributes": True}


class XPEventResponse(BaseModel):
    event_type: str
    xp_amount: int
    description: str
    earned_at: datetime

    model_config = {"from_attributes": True}


class SubtitleCreate(BaseModel):
    language_code: str = "en"


class SubtitleResponse(BaseModel):
    id: int
    content_id: int
    language_code: str
    is_auto_generated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AIProviderConfigCreate(BaseModel):
    provider_name: str
    api_key: Optional[str] = None
    model_name: str
    base_url: Optional[str] = None
    is_enabled: bool = True


class AIProviderConfigResponse(BaseModel):
    provider_name: str
    model_name: str
    base_url: Optional[str]
    is_enabled: bool
    has_api_key: bool  # never expose the key itself

    model_config = {"from_attributes": False}


class CourseGenerationRequest(BaseModel):
    prompt: str
    provider: str
    num_modules: int = 5


class QuizGenerationRequest(BaseModel):
    content_text: str
    provider: str
    num_questions: int = 5


class SummariseRequest(BaseModel):
    content_id: int
    provider: str
    mode: str = "summary"  # summary | key_points | flashcards


class QuizFromContentRequest(BaseModel):
    content_id: int
    provider: str
    num_questions: int = 5


class TeachBackQuestionsRequest(BaseModel):
    content_id: int
    provider: str


class TeachBackGradeRequest(BaseModel):
    question: str
    user_answer: str
    provider: str
