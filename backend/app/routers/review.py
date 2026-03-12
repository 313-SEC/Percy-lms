"""Spaced repetition review router using SM-2 algorithm."""
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.learning import Note
from app.models.review import ReviewCard
from app.models.user import User
from app.services.gamification_service import award_xp
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/review", tags=["review"])

def sm2_next(interval: int, ease: float, quality: int, repetitions: int):
    if quality < 3:
        return 1, max(1.3, ease - 0.2), 0
    new_ease = max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if repetitions == 0: new_interval = 1
    elif repetitions == 1: new_interval = 6
    else: new_interval = round(interval * new_ease)
    return new_interval, new_ease, repetitions + 1

@router.get("/due")
async def get_due_cards(db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    today = date.today()
    result = await db.execute(
        select(ReviewCard, Note).join(Note, ReviewCard.note_id == Note.id)
        .where(ReviewCard.due_date <= today).order_by(ReviewCard.due_date).limit(50)
    )
    rows = result.all()
    count_result = await db.execute(select(func.count(ReviewCard.id)).where(ReviewCard.due_date <= today))
    total_due = count_result.scalar() or 0
    return {
        "total_due": total_due,
        "cards": [{"card_id": card.id, "note_id": note.id, "note_title": note.title,
                   "note_body": note.body_markdown, "due_date": card.due_date.isoformat(),
                   "interval_days": card.interval_days, "repetitions": card.repetitions}
                  for card, note in rows],
    }

class GradeRequest(BaseModel):
    quality: int  # 0-5

@router.post("/{note_id}/grade")
async def grade_card(note_id: int, body: GradeRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if not (0 <= body.quality <= 5):
        raise HTTPException(status_code=422, detail="quality must be 0-5")
    result = await db.execute(select(ReviewCard).where(ReviewCard.note_id == note_id))
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Review card not found")
    new_interval, new_ease, new_reps = sm2_next(card.interval_days, card.ease_factor, body.quality, card.repetitions)
    card.interval_days = new_interval
    card.ease_factor = new_ease
    card.repetitions = new_reps
    card.due_date = date.today() + timedelta(days=new_interval)
    card.last_reviewed_at = datetime.now(timezone.utc)
    if body.quality >= 3:
        await award_xp(db, user, "card_reviewed", 3, "Reviewed a flashcard")
    await db.commit()
    return {"card_id": card.id, "next_due": card.due_date.isoformat(), "new_interval": card.interval_days, "xp_earned": 3 if body.quality >= 3 else 0}

@router.post("/cards/{note_id}", status_code=status.HTTP_201_CREATED)
async def create_review_card(note_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    note_result = await db.execute(select(Note).where(Note.id == note_id))
    if not note_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Note not found")
    existing = await db.execute(select(ReviewCard).where(ReviewCard.note_id == note_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Review card already exists for this note")
    card = ReviewCard(note_id=note_id, due_date=date.today())
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return {"card_id": card.id, "note_id": note_id, "due_date": card.due_date.isoformat()}

@router.delete("/cards/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_card(note_id: int, db: AsyncSession = Depends(get_db), _user: User = Depends(get_current_user)):
    result = await db.execute(select(ReviewCard).where(ReviewCard.note_id == note_id))
    card = result.scalar_one_or_none()
    if card:
        await db.delete(card)
        await db.commit()
