"""PayPay gateway stub.

Expected integration: PayPay Angola API for digital wallet payments.
Payment method type: DIGITAL_WALLET
"""

from app.gateways.angola_stub import AngolaGatewayStub
from app.models.enums import PaymentGatewayType


class PayPayGateway(AngolaGatewayStub):
    gateway_type = PaymentGatewayType.PAYPAY
    gateway_name = "PayPay"
