"""Base class for payment gateway providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.models.enums import PaymentGatewayType, PaymentStatus


@dataclass
class ChargeResult:
    success: bool
    gateway_payment_id: str | None
    status: PaymentStatus
    gateway_response: dict = field(default_factory=dict)
    failure_reason: str | None = None


@dataclass
class RefundResult:
    success: bool
    gateway_refund_id: str | None
    gateway_response: dict = field(default_factory=dict)
    failure_reason: str | None = None


@dataclass
class SetupResult:
    """Result of creating a setup session for adding a payment method."""

    client_secret: str
    gateway_setup_id: str | None = None
    metadata: dict = field(default_factory=dict)


class PaymentGatewayBase(ABC):
    gateway_type: PaymentGatewayType
    is_available: bool = True

    @abstractmethod
    async def create_charge(
        self,
        amount: int,
        currency: str,
        payment_method_token: str,
        customer_id: str | None = None,
        metadata: dict | None = None,
    ) -> ChargeResult:
        """Charge a payment method."""

    @abstractmethod
    async def refund(
        self,
        gateway_payment_id: str,
        amount: int | None = None,
    ) -> RefundResult:
        """Refund a payment. amount=None means full refund."""

    @abstractmethod
    async def create_setup_session(
        self,
        customer_id: str,
        metadata: dict | None = None,
    ) -> SetupResult:
        """Create a session for securely adding a payment method."""

    @abstractmethod
    async def get_or_create_customer(
        self,
        user_id: str,
        email: str | None = None,
        name: str | None = None,
        phone: str | None = None,
    ) -> str:
        """Get or create a customer in the gateway. Returns the gateway customer ID."""

    @abstractmethod
    async def get_payment_method_details(
        self,
        payment_method_token: str,
    ) -> dict:
        """Retrieve payment method details (label, brand, last4, etc.)."""

    @abstractmethod
    async def detach_payment_method(
        self,
        payment_method_token: str,
    ) -> bool:
        """Remove a payment method from the gateway."""
