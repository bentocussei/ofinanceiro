"""Referral router — generate codes, apply referrals, view stats."""

import secrets
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.referral import Referral
from app.models.user import User

router = APIRouter(prefix="/api/v1/referrals", tags=["referrals"])

BONUS_DAYS = 30  # days added per referral for both parties
MAX_REFERRALS = 12  # max 12 months free via referrals


def _generate_referral_code(name: str) -> str:
    """Generate a short, readable referral code like 'CUSSEI-F7K2'."""
    prefix = name.split()[0].upper()[:6] if name else "USER"
    suffix = secrets.token_hex(2).upper()
    return f"{prefix}-{suffix}"


class ReferralStatsResponse(BaseModel):
    referral_code: str
    total_referrals: int
    bonus_days_earned: int
    max_referrals: int = MAX_REFERRALS
    share_message: str


class ApplyReferralRequest(BaseModel):
    referral_code: str = Field(max_length=20)


@router.get("/stats")
async def get_referral_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReferralStatsResponse:
    """Get the current user's referral code and stats."""
    # Generate referral code if not yet created
    if not user.referral_code:
        code = _generate_referral_code(user.name)
        # Ensure uniqueness
        while await db.scalar(select(User.id).where(User.referral_code == code)):
            code = _generate_referral_code(user.name)
        user.referral_code = code
        await db.flush()
        await db.commit()

    # Count referrals
    total = await db.scalar(
        select(func.count(Referral.id)).where(Referral.referrer_id == user.id)
    ) or 0

    bonus_days = total * BONUS_DAYS

    share_msg = (
        f"Estou a usar O Financeiro para controlar as minhas finanças. "
        f"Regista-te com o meu código {user.referral_code} e ambos ganhamos "
        f"{BONUS_DAYS} dias grátis! https://ofinanceiro.app/register?ref={user.referral_code}"
    )

    return ReferralStatsResponse(
        referral_code=user.referral_code,
        total_referrals=total,
        bonus_days_earned=bonus_days,
        share_message=share_msg,
    )


# POST /apply removed — referral codes are now applied automatically
# during registration via the ?ref= URL parameter. Applying a referral
# code after registration is not supported (prevents abuse where two
# existing users swap codes for free days).
