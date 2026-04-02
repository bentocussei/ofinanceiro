import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.routers import (
    accounts,
    admin_billing,
    admin_roles,
    assets,
    auth,
    billing,
    bills,
    budgets,
    categories,
    chat,
    debts,
    education,
    expense_splits,
    families,
    finance_settings,
    goals,
    health,
    imports,
    income_sources,
    insights,
    investments,
    news,
    notifications,
    ocr,
    onboarding,
    permissions_router,
    recurring_rules,
    reports,
    score,
    snapshots,
    tags,
    transactions,
    users,
    voice,
    webhooks,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # Startup: create tables if they don't exist
    from app.database import engine
    from app.models import Base

    # Validate JWT secrets in non-development environments
    if settings.environment != "development" and "dev-secret" in settings.jwt_secret:
        logger.error("CRITICAL: Default JWT secrets in production! Set JWT_SECRET and JWT_REFRESH_SECRET")
        raise SystemExit(1)

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        logger.info("Database tables verified/created")
    except Exception as e:
        logger.warning("Table creation warning: %s", e)

    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    version=settings.api_version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)


# ---------------------------------------------------------------------------
# Global error handlers
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"])
        errors.append({"field": field, "message": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"code": "VALIDATION_ERROR", "message": "Dados inválidos", "errors": errors},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"code": "INTERNAL_ERROR", "message": "Erro interno do servidor"},
    )


# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if not settings.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ---------------------------------------------------------------------------
# Rate limiting middleware
# ---------------------------------------------------------------------------

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        # Skip rate limiting for health checks and OPTIONS
        if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)
        if request.method == "OPTIONS":
            return await call_next(request)

        try:
            from app.middleware.rate_limit import rate_limit_api
            await rate_limit_api(request)
        except Exception:
            # If Redis is unavailable, don't block requests
            pass

        return await call_next(request)


# Always enable rate limiting (gracefully skips if Redis unavailable)
app.add_middleware(RateLimitMiddleware)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Finance-Context"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(assets.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(families.router)
app.include_router(reports.router)
app.include_router(score.router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(ocr.router)
app.include_router(imports.router)
app.include_router(insights.router)
app.include_router(notifications.router)
app.include_router(billing.router)
app.include_router(admin_billing.router)
app.include_router(admin_roles.router)
app.include_router(onboarding.router)
app.include_router(debts.router)
app.include_router(investments.router)
app.include_router(news.router)
app.include_router(education.router)
app.include_router(users.router)
app.include_router(income_sources.router)
app.include_router(bills.router)
app.include_router(recurring_rules.router)
app.include_router(finance_settings.router)
app.include_router(snapshots.router)
app.include_router(expense_splits.router)
app.include_router(tags.router)
app.include_router(permissions_router.router)
app.include_router(webhooks.router)
