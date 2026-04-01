"""Finance Settings router: obter e actualizar preferências financeiras."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import CurrencyCode
from app.models.finance_settings import FinanceSettings
from app.models.user import User

router = APIRouter(prefix="/api/v1/finance-settings", tags=["finance-settings"])


class FinanceSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    default_currency: CurrencyCode | None = None
    month_start_day: int | None = Field(None, ge=1, le=31)
    budget_alert_threshold: int | None = Field(None, ge=0, le=100)
    low_balance_threshold: int | None = Field(None, ge=0)
    bill_reminder_days: list[int] | None = None
    email_notifications: bool | None = None
    push_notifications: bool | None = None
    weekly_report: bool | None = None
    monthly_report: bool | None = None


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
    data: FinanceSettingsUpdate,
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
    for key, value in data.model_dump(exclude_unset=True).items():
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
