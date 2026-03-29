"""Education router: daily tips, challenges, badges, streaks."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/education", tags=["education"])

DAILY_TIPS = [
    {"id": "1", "title": "Regra dos 50/30/20", "content": "Tente dividir o rendimento: 50% necessidades, 30% desejos, 20% poupança."},
    {"id": "2", "title": "Fundo de emergência", "content": "Guarde pelo menos 3 meses de despesas para emergências."},
    {"id": "3", "title": "Reveja subscrições", "content": "Verifique serviços que paga mensalmente. Está a usar todos?"},
    {"id": "4", "title": "Compras por impulso", "content": "Espere 24h antes de comprar algo não essencial acima de 10.000 Kz."},
    {"id": "5", "title": "Negoceie preços", "content": "Em Angola, muitos preços são negociáveis. Não tenha vergonha de pedir desconto."},
]

CHALLENGES = [
    {"id": "1", "title": "Semana sem Uber", "description": "Use candongueiro durante 7 dias e veja quanto poupa.", "xp": 50},
    {"id": "2", "title": "Cozinhar em casa", "description": "Prepare todas as refeições em casa durante 5 dias.", "xp": 75},
    {"id": "3", "title": "Registo diário", "description": "Registe todas as despesas durante 7 dias consecutivos.", "xp": 100},
]


@router.get("/daily-tip")
async def get_daily_tip(user: User = Depends(get_current_user)) -> dict:
    """Get today's financial tip."""
    today = date.today()
    tip_index = today.toordinal() % len(DAILY_TIPS)
    return DAILY_TIPS[tip_index]


@router.get("/challenges")
async def get_challenges(user: User = Depends(get_current_user)) -> list[dict]:
    """Get available weekly challenges."""
    return CHALLENGES


@router.get("/profile")
async def get_education_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Get user's education profile: XP, level, badges, streaks."""
    prefs = user.preferences or {}
    xp = prefs.get("xp", 0)
    level = xp // 100 + 1
    streak = prefs.get("streak_days", 0)
    badges = prefs.get("badges", [])

    return {
        "xp": xp,
        "level": level,
        "streak_days": streak,
        "badges": badges,
        "next_level_xp": level * 100,
        "xp_to_next": (level * 100) - xp,
    }
