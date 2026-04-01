"""SMS service for notifications via Twilio Messaging Service.

Usage:
    from app.services.sms import send_sms, send_bill_reminder_sms

Uses Messaging Service SID (Alpha Sender) for branded messages.
No-op when Twilio is not configured (development mode).
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def send_sms(to: str, body: str) -> bool:
    """Send SMS via Twilio. Returns True if sent, False otherwise."""
    if not settings.twilio_account_sid or settings.environment == "development":
        logger.info("DEV MODE — SMS para %s: %s", to, body[:80])
        return True

    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        params: dict = {"body": body, "to": to}

        if settings.twilio_messaging_service_sid:
            params["messaging_service_sid"] = settings.twilio_messaging_service_sid
        elif settings.twilio_phone_number:
            params["from_"] = settings.twilio_phone_number
        else:
            logger.error("Twilio: sem messaging_service_sid nem phone_number")
            return False

        client.messages.create(**params)
        logger.info("SMS enviado para %s", to)
        return True
    except Exception:
        logger.exception("Falha ao enviar SMS para %s", to)
        return False


# ---------------------------------------------------------------------------
# Notification templates
# ---------------------------------------------------------------------------

async def send_bill_reminder_sms(to: str, bill_name: str, amount_kz: str, due_date: str) -> bool:
    return await send_sms(to, f"O Financeiro: {bill_name} ({amount_kz}) vence a {due_date}.")


async def send_budget_alert_sms(to: str, category: str, percentage: int) -> bool:
    return await send_sms(to, f"O Financeiro: Orcamento {category} a {percentage}%. Reveja os seus gastos.")


async def send_goal_milestone_sms(to: str, goal_name: str, percentage: int) -> bool:
    return await send_sms(to, f"O Financeiro: Meta '{goal_name}' a {percentage}%! Continue assim.")


async def send_trial_ending_sms(to: str, days_left: int) -> bool:
    return await send_sms(to, f"O Financeiro: O seu periodo gratuito termina em {days_left} dias. Escolha um plano em ofinanceiro.app/settings")
