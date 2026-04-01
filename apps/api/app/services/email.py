"""Email service using Resend.

Usage:
    from app.services.email import send_email, send_welcome_email, send_password_reset_email

All functions are no-ops when RESEND_API_KEY is not configured (development mode).
"""

import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


def _init_resend() -> bool:
    """Initialize Resend with API key. Returns True if configured."""
    if not settings.resend_api_key:
        return False
    resend.api_key = settings.resend_api_key
    return True


async def send_email(
    to: str | list[str],
    subject: str,
    html: str,
    text: str | None = None,
) -> str | None:
    """Send an email via Resend. Returns email ID or None if not configured."""
    if not _init_resend():
        logger.info("Email skipped (no RESEND_API_KEY): to=%s subject=%s", to, subject)
        return None

    try:
        params: resend.Emails.SendParams = {
            "from": settings.email_from,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html,
        }
        if text:
            params["text"] = text

        result = resend.Emails.send(params)
        logger.info("Email sent: to=%s subject=%s id=%s", to, subject, result.get("id"))
        return result.get("id")
    except Exception as e:
        logger.error("Failed to send email: %s", e)
        return None


# ---------------------------------------------------------------------------
# Email templates
# ---------------------------------------------------------------------------

async def send_welcome_email(to: str, name: str) -> str | None:
    """Send welcome email after registration."""
    return await send_email(
        to=to,
        subject="Bem-vindo ao O Financeiro",
        html=f"""
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #166534; font-size: 24px; margin: 0;">O Financeiro</h1>
            </div>
            <h2 style="font-size: 20px;">Bem-vindo, {name}!</h2>
            <p style="color: #555; line-height: 1.6;">
                A sua conta foi criada com sucesso. Está a 90 dias de descobrir
                para onde vai cada Kwanza.
            </p>
            <p style="color: #555; line-height: 1.6;">
                Comece por adicionar as suas contas e registar as primeiras transacções.
                O assistente está pronto para ajudar.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://ofinanceiro.app/dashboard"
                   style="background: #166534; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Ir para o dashboard
                </a>
            </div>
            <p style="color: #999; font-size: 13px;">
                Se não criou esta conta, pode ignorar este email.
            </p>
        </div>
        """,
    )


async def send_trial_ending_email(to: str, name: str, days_left: int) -> str | None:
    """Send email when trial is about to end."""
    return await send_email(
        to=to,
        subject=f"O seu trial termina em {days_left} dias",
        html=f"""
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #166534; font-size: 24px; margin: 0;">O Financeiro</h1>
            </div>
            <h2 style="font-size: 20px;">{name}, o seu trial termina em {days_left} dias</h2>
            <p style="color: #555; line-height: 1.6;">
                Para continuar a ter acesso completo à plataforma, escolha um plano
                antes de o período gratuito terminar.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://ofinanceiro.app/settings"
                   style="background: #166534; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Escolher plano
                </a>
            </div>
        </div>
        """,
    )


async def send_payment_receipt_email(
    to: str, name: str, plan_name: str, amount_kz: str, period: str,
) -> str | None:
    """Send payment receipt email."""
    return await send_email(
        to=to,
        subject=f"Recibo — {plan_name} ({period})",
        html=f"""
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #166534; font-size: 24px; margin: 0;">O Financeiro</h1>
            </div>
            <h2 style="font-size: 20px;">Recibo de pagamento</h2>
            <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <table style="width: 100%; font-size: 14px; color: #333;">
                    <tr><td style="padding: 8px 0; color: #777;">Nome</td><td style="text-align: right;">{name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #777;">Plano</td><td style="text-align: right;">{plan_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #777;">Período</td><td style="text-align: right;">{period}</td></tr>
                    <tr style="border-top: 1px solid #ddd;"><td style="padding: 12px 0; font-weight: bold;">Total</td><td style="text-align: right; font-weight: bold;">{amount_kz}</td></tr>
                </table>
            </div>
            <p style="color: #999; font-size: 13px;">
                Este recibo foi gerado automaticamente. Para questões sobre a sua subscrição,
                aceda às configurações da sua conta.
            </p>
        </div>
        """,
    )


async def send_subscription_cancelled_email(to: str, name: str, end_date: str) -> str | None:
    """Send confirmation of subscription cancellation."""
    return await send_email(
        to=to,
        subject="Subscrição cancelada",
        html=f"""
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #166534; font-size: 24px; margin: 0;">O Financeiro</h1>
            </div>
            <h2 style="font-size: 20px;">{name}, a sua subscrição foi cancelada</h2>
            <p style="color: #555; line-height: 1.6;">
                O seu acesso continua activo até <strong>{end_date}</strong>.
                Após essa data, os dados ficam guardados mas o acesso será limitado.
            </p>
            <p style="color: #555; line-height: 1.6;">
                Pode reactivar a qualquer momento nas configurações.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://ofinanceiro.app/settings"
                   style="background: #166534; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Reactivar subscrição
                </a>
            </div>
        </div>
        """,
    )


async def send_bill_reminder_email(to: str, name: str, bill_name: str, amount_kz: str, due_date: str) -> str | None:
    """Send bill payment reminder."""
    return await send_email(
        to=to,
        subject=f"Lembrete: {bill_name} vence em breve",
        html=f"""
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #166534; font-size: 24px; margin: 0;">O Financeiro</h1>
            </div>
            <h2 style="font-size: 20px;">{name}, tem uma conta a vencer</h2>
            <div style="background: #fff3cd; border-radius: 8px; padding: 20px; margin: 16px 0;">
                <p style="margin: 0; font-weight: 600;">{bill_name}</p>
                <p style="margin: 8px 0 0; color: #555;">Valor: <strong>{amount_kz}</strong></p>
                <p style="margin: 4px 0 0; color: #555;">Vencimento: <strong>{due_date}</strong></p>
            </div>
            <div style="text-align: center; margin: 32px 0;">
                <a href="https://ofinanceiro.app/bills"
                   style="background: #166534; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Ver contas a pagar
                </a>
            </div>
        </div>
        """,
    )
