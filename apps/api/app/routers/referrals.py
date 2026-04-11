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


@router.post("/apply")
async def apply_referral_code(
    data: ApplyReferralRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Apply a referral code (used during/after registration)."""
    code = data.referral_code.strip().upper()

    # Can't refer yourself
    if user.referral_code and user.referral_code.upper() == code:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Não podes usar o teu próprio código de referência.",
        )

    # Already referred
    if user.referred_by:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Já utilizaste um código de referência anteriormente.",
        )

    # Find referrer
    referrer = await db.scalar(
        select(User).where(func.upper(User.referral_code) == code)
    )
    if not referrer:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="Código de referência inválido.",
        )

    # Check referrer hasn't exceeded max
    referrer_count = await db.scalar(
        select(func.count(Referral.id)).where(Referral.referrer_id == referrer.id)
    ) or 0
    if referrer_count >= MAX_REFERRALS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Este código já atingiu o limite máximo de referências.",
        )

    # Create referral record
    referral = Referral(
        referrer_id=referrer.id,
        referred_id=user.id,
        referral_code=code,
        bonus_days_granted=BONUS_DAYS,
    )
    db.add(referral)

    # Link referred_by
    user.referred_by = referrer.id

    # Extend trial for both parties
    from app.models.subscription import UserSubscription

    for target_user in [user, referrer]:
        sub = await db.scalar(
            select(UserSubscription)
            .where(
                UserSubscription.user_id == target_user.id,
                UserSubscription.status.in_(["active", "trialing"]),
            )
            .order_by(UserSubscription.created_at.desc())
            .limit(1)
        )
        if sub and sub.trial_end_date:
            sub.trial_end_date += timedelta(days=BONUS_DAYS)
        elif sub and sub.end_date:
            sub.end_date += timedelta(days=BONUS_DAYS)

    await db.commit()

    return {
        "success": True,
        "message": f"Código aplicado! Tu e {referrer.name.split()[0]} ganharam {BONUS_DAYS} dias grátis.",
        "bonus_days": BONUS_DAYS,
        "referrer_name": referrer.name.split()[0],
    }
