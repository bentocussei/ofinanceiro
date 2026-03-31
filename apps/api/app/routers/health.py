from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> JSONResponse:
    """Health check with DB and Redis connectivity status."""
    checks: dict[str, str] = {"api": "ok"}

    # Check DB
    try:
        from app.database import async_session

        async with async_session() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"

    # Check Redis
    try:
        from app.services.otp import get_redis

        r = await get_redis()
        await r.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503

    return JSONResponse(
        content={
            "status": "ok" if all_ok else "degraded",
            "service": "ofinanceiro-api",
            "checks": checks,
        },
        status_code=status_code,
    )


@router.get("/health/ready")
async def readiness_check() -> JSONResponse:
    """Readiness probe — returns 200 only if all dependencies are healthy."""
    try:
        from app.database import async_session

        async with async_session() as db:
            await db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(
            content={"ready": False, "reason": "database"},
            status_code=503,
        )

    try:
        from app.services.otp import get_redis

        r = await get_redis()
        await r.ping()
    except Exception:
        return JSONResponse(
            content={"ready": False, "reason": "redis"},
            status_code=503,
        )

    return JSONResponse(content={"ready": True}, status_code=200)
