"""Unitel Money gateway stub.

Expected integration: Unitel Money API for mobile wallet payments.
Users pay via Unitel Money using phone number.
Payment method type: DIGITAL_WALLET
"""

from app.gateways.angola_stub import AngolaGatewayStub
from app.models.enums import PaymentGatewayType


class UnitelMoneyGateway(AngolaGatewayStub):
    gateway_type = PaymentGatewayType.UNITEL_MONEY
    gateway_name = "Unitel Money"
