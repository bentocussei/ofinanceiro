"""Stripe payment gateway implementation."""

import logging

import stripe

from app.config import settings
from app.gateways.base import (
    ChargeResult,
    PaymentGatewayBase,
    RefundResult,
    SetupResult,
)
from app.models.enums import PaymentGatewayType, PaymentStatus

logger = logging.getLogger(__name__)


class StripeGateway(PaymentGatewayBase):
    gateway_type = PaymentGatewayType.STRIPE

    def __init__(self) -> None:
        self.is_available = bool(settings.stripe_secret_key)
        if self.is_available:
            stripe.api_key = settings.stripe_secret_key

    async def create_charge(
        self,
        amount: int,
        currency: str,
        payment_method_token: str,
        customer_id: str | None = None,
        metadata: dict | None = None,
    ) -> ChargeResult:
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency.lower(),
                payment_method=payment_method_token,
                customer=customer_id,
                confirm=True,
                automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
                metadata=metadata or {},
            )
            succeeded = intent.status == "succeeded"
            return ChargeResult(
                success=succeeded,
                gateway_payment_id=intent.id,
                status=PaymentStatus.COMPLETED if succeeded else PaymentStatus.PROCESSING,
                gateway_response={"status": intent.status, "id": intent.id},
            )
        except stripe.CardError as e:
            logger.warning("Stripe card error: %s", e.user_message)
            return ChargeResult(
                success=False,
                gateway_payment_id=None,
                status=PaymentStatus.FAILED,
                gateway_response={"error": str(e)},
                failure_reason=e.user_message,
            )
        except stripe.StripeError as e:
            logger.error("Stripe error: %s", e)
            return ChargeResult(
                success=False,
                gateway_payment_id=None,
                status=PaymentStatus.FAILED,
                gateway_response={"error": str(e)},
                failure_reason=str(e),
            )

    async def refund(
        self,
        gateway_payment_id: str,
        amount: int | None = None,
    ) -> RefundResult:
        try:
            params: dict = {"payment_intent": gateway_payment_id}
            if amount is not None:
                params["amount"] = amount
            refund = stripe.Refund.create(**params)
            return RefundResult(
                success=refund.status == "succeeded",
                gateway_refund_id=refund.id,
                gateway_response={"status": refund.status, "id": refund.id},
            )
        except stripe.StripeError as e:
            logger.error("Stripe refund error: %s", e)
            return RefundResult(
                success=False,
                gateway_refund_id=None,
                gateway_response={"error": str(e)},
                failure_reason=str(e),
            )

    async def create_setup_session(
        self,
        customer_id: str,
        metadata: dict | None = None,
    ) -> SetupResult:
        intent = stripe.SetupIntent.create(
            customer=customer_id,
            automatic_payment_methods={"enabled": True},
            metadata=metadata or {},
        )
        return SetupResult(
            client_secret=intent.client_secret,
            gateway_setup_id=intent.id,
            metadata={"publishable_key": settings.stripe_publishable_key},
        )

    async def get_or_create_customer(
        self,
        user_id: str,
        email: str | None = None,
        name: str | None = None,
        phone: str | None = None,
    ) -> str:
        # Search for existing customer by metadata
        customers = stripe.Customer.search(
            query=f'metadata["user_id"]:"{user_id}"',
        )
        if customers.data:
            return customers.data[0].id

        # Create new customer
        params: dict = {"metadata": {"user_id": user_id}}
        if email:
            params["email"] = email
        if name:
            params["name"] = name
        if phone:
            params["phone"] = phone
        customer = stripe.Customer.create(**params)
        return customer.id

    async def get_payment_method_details(
        self,
        payment_method_token: str,
    ) -> dict:
        pm = stripe.PaymentMethod.retrieve(payment_method_token)
        details: dict = {
            "type": pm.type,
            "gateway": "stripe",
        }
        if pm.card:
            details.update({
                "brand": pm.card.brand,
                "last4": pm.card.last4,
                "exp_month": pm.card.exp_month,
                "exp_year": pm.card.exp_year,
                "label": f"{pm.card.brand.upper()} ***{pm.card.last4}",
            })
        return details

    async def detach_payment_method(
        self,
        payment_method_token: str,
    ) -> bool:
        try:
            stripe.PaymentMethod.detach(payment_method_token)
            return True
        except stripe.StripeError as e:
            logger.error("Stripe detach error: %s", e)
            return False
