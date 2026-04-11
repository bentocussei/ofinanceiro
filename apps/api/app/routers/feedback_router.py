"""Feedback router — public endpoint for ratings, suggestions, complaints.

No authentication required — anonymous users from the landing page can
submit feedback. Logged-in users get their user_id attached automatically.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.feedback import Feedback, FeedbackType

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    type: FeedbackType
    rating: int | None = Field(None, ge=1, le=5)
    message: str | None = Field(None, max_length=2000)
    contact_name: str | None = Field(None, max_length=100)
    contact_email: str | None = Field(None, max_length=200)
    contact_phone: str | None = Field(None, max_length=20)
    page_url: str | None = Field(None, max_length=500)


def _get_optional_user_id(request: Request):
    """Extract user_id from JWT if present, None otherwise."""
    import jwt
    from app.config import settings

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        import uuid
        payload = jwt.decode(auth[7:], settings.jwt_secret, algorithms=["HS256"])
        return uuid.UUID(payload["sub"])
    except Exception:
        return None


@router.post("/", status_code=201)
async def submit_feedback(
    data: FeedbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Submit feedback — works for both anonymous and logged-in users.

    No authentication required. If a valid JWT is present, the user_id
    is extracted and attached to the feedback automatically.
    """
    user_id = _get_optional_user_id(request)
    user_agent = request.headers.get("User-Agent", "")[:500]

    # Validate: rating required for type=rating
    if data.type == FeedbackType.RATING and data.rating is None:
        from fastapi import HTTPException, status
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A avaliação (1-5 estrelas) é obrigatória para o tipo 'rating'.",
        )

    feedback = Feedback(
        user_id=user_id,
        type=data.type,
        rating=data.rating,
        message=data.message,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        page_url=data.page_url,
        user_agent=user_agent,
    )
    db.add(feedback)
    await db.commit()

    return {
        "success": True,
        "message": "Obrigado pelo teu feedback! A tua opinião ajuda-nos a melhorar.",
        "id": str(feedback.id),
    }


@router.get("/summary")
async def get_feedback_summary(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Public summary — average rating and count. For landing page display."""
    from sqlalchemy import func, select

    result = await db.execute(
        select(
            func.count(Feedback.id).label("total"),
            func.avg(Feedback.rating).label("avg_rating"),
            func.count(Feedback.rating).label("rating_count"),
        ).where(Feedback.type == FeedbackType.RATING)
    )
    row = result.one()

    return {
        "total_feedback": row.total or 0,
        "average_rating": round(float(row.avg_rating or 0), 1),
        "rating_count": row.rating_count or 0,
    }
