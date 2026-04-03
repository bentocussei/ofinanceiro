"""Company settings model — configurable business details for invoicing."""

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class CompanySettings(BaseModel):
    """Single-row table with O Financeiro's business details.

    Used in invoices, receipts, SAFT-T export, and QR codes.
    Editable via admin panel.
    """

    __tablename__ = "company_settings"

    name: Mapped[str] = mapped_column(String(200), default="O Financeiro, Lda")
    trade_name: Mapped[str | None] = mapped_column(String(200))
    nif: Mapped[str] = mapped_column(String(14), default="0000000000")
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(100), default="Luanda")
    province: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(2), default="AO")
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str] = mapped_column(String(200), default="suporte@ofinanceiro.app")
    website: Mapped[str | None] = mapped_column(String(200))

    # Tax configuration
    vat_rate: Mapped[int] = mapped_column(Integer, default=0)  # 0 = exempt, 14 = standard
    vat_exempt_reason: Mapped[str] = mapped_column(String(10), default="M01")
    tax_regime: Mapped[str] = mapped_column(String(50), default="Regime Geral")

    # AGT integration
    agt_certificate_number: Mapped[str] = mapped_column(String(20), default="0")
    agt_software_number: Mapped[str | None] = mapped_column(String(20))

    # Extra
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, default=dict)
