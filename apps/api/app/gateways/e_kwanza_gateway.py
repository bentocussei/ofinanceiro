"""e-Kwanza gateway stub.

Expected integration: e-Kwanza API for digital wallet payments.
Payment method type: DIGITAL_WALLET
"""

from app.gateways.angola_stub import AngolaGatewayStub
from app.models.enums import PaymentGatewayType


class EKwanzaGateway(AngolaGatewayStub):
    gateway_type = PaymentGatewayType.E_KWANZA
    gateway_name = "e-Kwanza"
