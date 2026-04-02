"""Payment gateway registry."""

from app.gateways.base import (
    ChargeResult,
    PaymentGatewayBase,
    RefundResult,
    SetupResult,
)
from app.gateways.e_kwanza_gateway import EKwanzaGateway
from app.gateways.multicaixa_gateway import MulticaixaGateway
from app.gateways.paypay_gateway import PayPayGateway
from app.gateways.referencia_bancaria_gateway import ReferenciaBancariaGateway
from app.gateways.stripe_gateway import StripeGateway
from app.gateways.unitel_money_gateway import UnitelMoneyGateway
from app.models.enums import PaymentGatewayType

_REGISTRY: dict[PaymentGatewayType, type[PaymentGatewayBase]] = {
    PaymentGatewayType.STRIPE: StripeGateway,
    PaymentGatewayType.MULTICAIXA_EXPRESS: MulticaixaGateway,
    PaymentGatewayType.REFERENCIA_BANCARIA: ReferenciaBancariaGateway,
    PaymentGatewayType.UNITEL_MONEY: UnitelMoneyGateway,
    PaymentGatewayType.E_KWANZA: EKwanzaGateway,
    PaymentGatewayType.PAYPAY: PayPayGateway,
}


def get_gateway(gateway_type: PaymentGatewayType) -> PaymentGatewayBase:
    """Get a gateway instance by type. Raises ValueError if unknown or unavailable."""
    cls = _REGISTRY.get(gateway_type)
    if not cls:
        raise ValueError(f"Gateway desconhecido: {gateway_type}")
    instance = cls()
    if not instance.is_available:
        raise ValueError(f"Gateway {gateway_type} ainda não está disponível")
    return instance


def list_available_gateways() -> list[PaymentGatewayType]:
    """Return list of currently available (configured) gateways."""
    available = []
    for gw_type, cls in _REGISTRY.items():
        instance = cls()
        if instance.is_available:
            available.append(gw_type)
    return available


__all__ = [
    "ChargeResult",
    "PaymentGatewayBase",
    "RefundResult",
    "SetupResult",
    "get_gateway",
    "list_available_gateways",
]
