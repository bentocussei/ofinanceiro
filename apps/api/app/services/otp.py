"""OTP service: generate, store in Redis, verify, and send via SMS."""

import logging
import secrets

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_MAX_ATTEMPTS = 5
OTP_COOLDOWN_SECONDS = 600  # 10 minutes for max attempts window

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _otp_key(phone: str) -> str:
    return f"otp:{phone}"


def _otp_attempts_key(phone: str) -> str:
    return f"otp_attempts:{phone}"


def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


async def store_otp(phone: str, otp: str) -> None:
    """Store OTP in Redis with TTL."""
    r = await get_redis()
    await r.setex(_otp_key(phone), OTP_TTL_SECONDS, otp)


async def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP. Returns True if valid, increments attempts counter."""
    r = await get_redis()

    # Check rate limit
    attempts = await r.get(_otp_attempts_key(phone))
    if attempts and int(attempts) >= OTP_MAX_ATTEMPTS:
        return False

    # Increment attempts
    pipe = r.pipeline()
    pipe.incr(_otp_attempts_key(phone))
    pipe.expire(_otp_attempts_key(phone), OTP_COOLDOWN_SECONDS)
    await pipe.execute()

    # Get stored OTP
    stored = await r.get(_otp_key(phone))
    if stored is None:
        return False

    if stored != otp:
        return False

    # OTP valid — delete it (single use)
    await r.delete(_otp_key(phone))
    await r.delete(_otp_attempts_key(phone))
    return True


async def can_send_otp(phone: str) -> bool:
    """Check if we can send OTP (rate limit not exceeded)."""
    r = await get_redis()
    attempts = await r.get(_otp_attempts_key(phone))
    return not (attempts and int(attempts) >= OTP_MAX_ATTEMPTS)


async def send_otp_sms(phone: str, otp: str) -> bool:
    """Send OTP via SMS. Uses Twilio in production, logs in development."""
    if settings.environment == "development" or not settings.twilio_account_sid:
        logger.info("DEV MODE — OTP para %s: %s", phone, otp)
        return True

    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        params: dict = {
            "body": f"O Financeiro: O seu código é {otp}. Válido por 5 minutos.",
            "to": phone,
        }
        # Use Messaging Service SID (Alpha Sender) if configured, otherwise phone number
        if settings.twilio_messaging_service_sid:
            params["messaging_service_sid"] = settings.twilio_messaging_service_sid
        elif settings.twilio_phone_number:
            params["from_"] = settings.twilio_phone_number
        else:
            logger.error("Twilio: sem messaging_service_sid nem phone_number configurado")
            return False

        client.messages.create(**params)
        return True
    except Exception:
        logger.exception("Falha ao enviar SMS para %s", phone)
        return False
