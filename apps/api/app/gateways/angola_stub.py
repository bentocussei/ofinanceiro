"""Base stub for Angolan payment gateways (not yet available)."""

from app.gateways.base import (
    ChargeResult,
    PaymentGatewayBase,
    RefundResult,
    SetupResult,
)


class AngolaGatewayStub(PaymentGatewayBase):
    """Base for Angolan gateways that are not yet integrated.

    Each subclass sets gateway_type and gateway_name.
    When the real API becomes available, override the abstract methods
    with the actual implementation.
    """

    is_available = False
    gateway_name: str = "Unknown"

    def _unavailable(self) -> str:
        return f"Gateway {self.gateway_name} ainda não está disponível"

    async def create_charge(
        self,
        amount: int,
        currency: str,
        payment_method_token: str,
        customer_id: str | None = None,
        metadata: dict | None = None,
    ) -> ChargeResult:
        raise NotImplementedError(self._unavailable())

    async def refund(
        self,
        gateway_payment_id: str,
        amount: int | None = None,
    ) -> RefundResult:
        raise NotImplementedError(self._unavailable())

    async def create_setup_session(
        self,
        customer_id: str,
        metadata: dict | None = None,
    ) -> SetupResult:
        raise NotImplementedError(self._unavailable())

    async def get_or_create_customer(
        self,
        user_id: str,
        email: str | None = None,
        name: str | None = None,
        phone: str | None = None,
    ) -> str:
        raise NotImplementedError(self._unavailable())

    async def get_payment_method_details(
        self,
        payment_method_token: str,
    ) -> dict:
        raise NotImplementedError(self._unavailable())

    async def detach_payment_method(
        self,
        payment_method_token: str,
    ) -> bool:
        raise NotImplementedError(self._unavailable())
