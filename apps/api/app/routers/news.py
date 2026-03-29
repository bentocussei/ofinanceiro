"""News router: financial news feed and exchange rates."""

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/news", tags=["news"])


@router.get("/")
async def get_news_feed(
    user: User = Depends(get_current_user),
) -> list[dict]:
    """Get curated financial news for Angola/PALOP.
    In production, this would scrape RSS/API sources.
    """
    # Placeholder feed — in production, scrape from BNA, Jornal de Angola, etc.
    return [
        {
            "id": "1",
            "title": "BNA mantém taxa de juro de referência em 19,5%",
            "summary": "O Banco Nacional de Angola decidiu manter a taxa básica de juro inalterada.",
            "source": "BNA",
            "date": "2026-03-28",
            "category": "política_monetária",
        },
        {
            "id": "2",
            "title": "Kwanza estabiliza face ao dólar",
            "summary": "A taxa de câmbio Kz/USD mantém-se estável no mercado oficial.",
            "source": "Jornal de Angola",
            "date": "2026-03-27",
            "category": "câmbio",
        },
    ]


@router.get("/exchange-rates")
async def get_exchange_rates(
    user: User = Depends(get_current_user),
) -> dict:
    """Get current exchange rates (BNA official).
    In production, would fetch from BNA API.
    """
    return {
        "base": "AOA",
        "rates": {
            "USD": {"buy": 832.50, "sell": 840.00},
            "EUR": {"buy": 905.00, "sell": 915.00},
        },
        "source": "BNA (simulado)",
        "date": "2026-03-29",
    }
