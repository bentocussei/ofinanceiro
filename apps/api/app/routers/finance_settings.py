"""Finance Settings router: obter e actualizar preferências financeiras."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.finance_settings import FinanceSettings
from app.models.user import User

router = APIRouter(prefix="/api/v1/finance-settings", tags=["finance-settings"])


@router.get("/")
async def get_finance_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Obter configurações financeiras do utilizador. Cria com defaults se não existir."""
    stmt = select(FinanceSettings).where(FinanceSettings.user_id == user.id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        settings = FinanceSettings(user_id=user.id)
        db.add(settings)
        await db.flush()
        await db.refresh(settings)
    return _to_dict(settings)


@router.put("/")
async def update_finance_settings(
    data: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Actualizar configurações financeiras do utilizador."""
    stmt = select(FinanceSettings).where(FinanceSettings.user_id == user.id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        settings = FinanceSettings(user_id=user.id)
        db.add(settings)
    for key, value in data.items():
        if hasattr(settings, key) and key not in ("id", "user_id", "created_at", "updated_at"):
            setattr(settings, key, value)
    await db.flush()
    await db.refresh(settings)
    return _to_dict(settings)


def _to_dict(settings: FinanceSettings) -> dict:
    return {
        "id": settings.id,
        "user_id": settings.user_id,
        "default_currency": settings.default_currency,
        "month_start_day": settings.month_start_day,
        "budget_alert_threshold": settings.budget_alert_threshold,
        "low_balance_threshold": settings.low_balance_threshold,
        "bill_reminder_days": settings.bill_reminder_days,
        "email_notifications": settings.email_notifications,
        "push_notifications": settings.push_notifications,
        "weekly_report": settings.weekly_report,
        "monthly_report": settings.monthly_report,
        "created_at": settings.created_at,
        "updated_at": settings.updated_at,
    }
