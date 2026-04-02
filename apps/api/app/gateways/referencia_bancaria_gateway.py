"""Referencia Bancaria gateway stub.

Expected integration: Generate bank payment references (entidade + referencia + valor).
Users pay at any Multicaixa ATM or via home banking.
Payment method type: BANK_REFERENCE
"""

from app.gateways.angola_stub import AngolaGatewayStub
from app.models.enums import PaymentGatewayType


class ReferenciaBancariaGateway(AngolaGatewayStub):
    gateway_type = PaymentGatewayType.REFERENCIA_BANCARIA
    gateway_name = "Referencia Bancaria"
