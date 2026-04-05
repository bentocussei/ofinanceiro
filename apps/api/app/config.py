from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    environment: str = "development"
    debug: bool = True
    app_name: str = "O Financeiro API"
    api_version: str = "v1"

    # Database
    database_url: str = "postgresql+asyncpg://ofinanceiro:ofinanceiro@localhost:5432/ofinanceiro"

    @property
    def async_database_url(self) -> str:
        """Ensure the database URL uses asyncpg driver (Railway gives postgresql://)."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_refresh_secret: str = "dev-refresh-secret-change-in-production"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 7

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8081"

    # Rate Limiting
    rate_limit_per_minute: int = 100
    chat_rate_limit_per_minute: int = 20

    # Twilio (SMS OTP + notifications)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""  # fallback if no messaging service
    twilio_messaging_service_sid: str = ""  # preferred: Alpha Sender

    # Stripe (Billing)
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # Service Token (cron jobs)
    service_token: str = ""

    # Email (Resend)
    resend_api_key: str = ""
    email_from: str = "O Financeiro <noreply@ofinanceiro.app>"

    # Storage (Cloudflare R2 / S3-compatible)
    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "ofinanceiro-storage"
    r2_public_url: str = ""  # CDN URL for public files (optional)

    # AI
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()
