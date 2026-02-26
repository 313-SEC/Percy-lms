"""AI provider configuration and course/quiz generation router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_config import AIProviderConfig
from app.models.user import User
from app.schemas.gamification import (
    AIProviderConfigCreate,
    AIProviderConfigResponse,
    CourseGenerationRequest,
    QuizGenerationRequest,
)
from app.services.ai_service import ai_service
from app.utils.deps import get_current_user, get_db
from app.utils.security import encrypt_api_key

router = APIRouter(prefix="/ai", tags=["ai"])

ALLOWED_PROVIDERS = {"openai", "anthropic", "gemini", "ollama", "huggingface"}


@router.get("/providers", response_model=list[AIProviderConfigResponse])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(AIProviderConfig))
    configs = result.scalars().all()
    return [
        AIProviderConfigResponse(
            provider_name=c.provider_name,
            model_name=c.model_name,
            base_url=c.base_url,
            is_enabled=c.is_enabled,
            has_api_key=bool(c.api_key_encrypted),
        )
        for c in configs
    ]


@router.post("/providers", response_model=AIProviderConfigResponse, status_code=status.HTTP_201_CREATED)
async def upsert_provider(
    body: AIProviderConfigCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if body.provider_name not in ALLOWED_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown provider. Allowed: {', '.join(sorted(ALLOWED_PROVIDERS))}",
        )

    result = await db.execute(
        select(AIProviderConfig).where(AIProviderConfig.provider_name == body.provider_name)
    )
    config = result.scalar_one_or_none()

    encrypted_key = encrypt_api_key(body.api_key) if body.api_key else None

    if config:
        config.model_name = body.model_name
        config.base_url = body.base_url
        config.is_enabled = body.is_enabled
        if encrypted_key is not None:
            config.api_key_encrypted = encrypted_key
    else:
        config = AIProviderConfig(
            provider_name=body.provider_name,
            api_key_encrypted=encrypted_key,
            model_name=body.model_name,
            base_url=body.base_url,
            is_enabled=body.is_enabled,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)

    return AIProviderConfigResponse(
        provider_name=config.provider_name,
        model_name=config.model_name,
        base_url=config.base_url,
        is_enabled=config.is_enabled,
        has_api_key=bool(config.api_key_encrypted),
    )


async def _get_enabled_provider(provider_name: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(AIProviderConfig).where(
            AIProviderConfig.provider_name == provider_name,
            AIProviderConfig.is_enabled.is_(True),
        )
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Provider '{provider_name}' is not configured or not enabled",
        )
    return {
        "provider_name": config.provider_name,
        "api_key_encrypted": config.api_key_encrypted,
        "model_name": config.model_name,
        "base_url": config.base_url,
    }


@router.post("/generate/course")
async def generate_course(
    body: CourseGenerationRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    config = await _get_enabled_provider(body.provider, db)
    try:
        result = await ai_service.generate_course_outline(config, body.prompt, body.num_modules)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {exc}",
        )
    return result


@router.post("/generate/quiz")
async def generate_quiz(
    body: QuizGenerationRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    config = await _get_enabled_provider(body.provider, db)
    try:
        result = await ai_service.generate_quiz(config, body.content_text, body.num_questions)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generation failed: {exc}",
        )
    return result
