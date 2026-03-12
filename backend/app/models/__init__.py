"""Import all models so SQLAlchemy Base registers them."""
from app.models.user import User, UserStats, RefreshToken  # noqa: F401
from app.models.course import Course, Module, Content  # noqa: F401
from app.models.progress import VideoProgress, PomodoroSession  # noqa: F401
from app.models.learning import Bookmark, Note, Subtitle  # noqa: F401
from app.models.gamification import XPEvent, Achievement, DailyStreak  # noqa: F401
from app.models.ai_config import AIProviderConfig  # noqa: F401
from app.models.review import ReviewCard  # noqa: F401
