from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    environment: str = "development"
    debug: bool = True
    app_name: str = "O Financeiro API"
    api_version: str = "v1"

    # Database
    database_url: str = "postgresql+asyncpg://ofinanceiro:ofinanceiro@localhost:5432/ofinanceiro"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_refresh_secret: str = "dev-refresh-secret-change-in-production"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7

    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8081"

    # Rate Limiting
    rate_limit_per_minute: int = 100
    chat_rate_limit_per_minute: int = 20

    # Twilio (SMS OTP)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # AI
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]


settings = Settings()
