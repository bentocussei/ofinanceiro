"""Multicaixa Express (MCX) gateway stub.

Expected integration: MCX API for mobile payments in Angola.
Users pay via Multicaixa Express app using phone number.
Payment method type: MOBILE_MONEY
"""

from app.gateways.angola_stub import AngolaGatewayStub
from app.models.enums import PaymentGatewayType


class MulticaixaGateway(AngolaGatewayStub):
    gateway_type = PaymentGatewayType.MULTICAIXA_EXPRESS
    gateway_name = "Multicaixa Express"
