"""Onboarding router: guided setup flow."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


class OnboardingStepRequest(BaseModel):
    step: str = Field(description="Step name: currency, salary_day, first_account, demo_complete")
    data: dict = Field(default_factory=dict)


@router.get("/status")
async def get_onboarding_status(
    user: User = Depends(get_current_user),
) -> dict:
    """Get onboarding completion status."""
    prefs = user.preferences or {}
    completed_steps = prefs.get("onboarding_steps", [])

    all_steps = ["welcome", "currency", "salary_day", "first_account", "demo"]
    remaining = [s for s in all_steps if s not in completed_steps]

    return {
        "completed": user.onboarding_completed,
        "completed_steps": completed_steps,
        "remaining_steps": remaining,
        "total_steps": len(all_steps),
        "progress": len(completed_steps) / len(all_steps) * 100,
    }


@router.put("/step")
async def complete_step(
    data: OnboardingStepRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Mark an onboarding step as complete and save associated data."""
    prefs = dict(user.preferences or {})
    completed_steps = list(prefs.get("onboarding_steps", []))

    if data.step not in completed_steps:
        completed_steps.append(data.step)
    prefs["onboarding_steps"] = completed_steps

    # Save step-specific data
    if data.step == "currency" and "currency" in data.data:
        user.currency_default = data.data["currency"]
    if data.step == "salary_day" and "salary_day" in data.data:
        user.salary_day = data.data["salary_day"]

    user.preferences = prefs

    # Check if all steps complete
    all_steps = {"welcome", "currency", "salary_day", "first_account", "demo"}
    if all_steps.issubset(set(completed_steps)):
        user.onboarding_completed = True

    await db.flush()

    return {
        "step": data.step,
        "completed": user.onboarding_completed,
        "completed_steps": completed_steps,
    }
