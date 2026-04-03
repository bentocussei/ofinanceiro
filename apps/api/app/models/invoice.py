"""Invoice, InvoiceLine, and Receipt models — AGT-compliant fiscal documents."""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import (
    AGTSyncStatus,
    CurrencyCode,
    DocumentStatus,
    DocumentType,
)


class Invoice(BaseModel):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("document_number", name="uq_invoice_document_number"),
        UniqueConstraint("atcud", name="uq_invoice_atcud"),
        Index("idx_invoice_user", "user_id"),
        Index("idx_invoice_status", "status"),
    )

    # Document identification
    document_type: Mapped[DocumentType] = mapped_column(
        ENUM(DocumentType, name="document_type", create_type=True)
    )
    document_number: Mapped[str] = mapped_column(String(30))  # "FT 2026/000001"
    series_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("document_series.id", ondelete="RESTRICT")
    )

    # AGT compliance fields
    hash: Mapped[str] = mapped_column(String(200))  # SHA-256 base64
    hash_control: Mapped[str] = mapped_column(String(4))  # 4-char control
    atcud: Mapped[str] = mapped_column(String(70))  # Codigo Unico de Documento
    qr_code_data: Mapped[str | None] = mapped_column(Text)
    previous_hash: Mapped[str | None] = mapped_column(String(200))
    agt_sync_status: Mapped[AGTSyncStatus] = mapped_column(
        ENUM(AGTSyncStatus, name="agt_sync_status", create_type=True),
        default=AGTSyncStatus.PENDING,
    )
    agt_sync_error: Mapped[str | None] = mapped_column(Text)

    # Customer (snapshot at invoice time)
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    customer_name: Mapped[str] = mapped_column(String(200))
    customer_nif: Mapped[str | None] = mapped_column(String(14))  # NIF angolano
    customer_email: Mapped[str | None] = mapped_column(String(200))
    customer_phone: Mapped[str | None] = mapped_column(String(20))
    customer_address: Mapped[str | None] = mapped_column(Text)

    # Amounts (all centavos AOA)
    subtotal: Mapped[int] = mapped_column(Integer)  # sum of lines before discount/tax
    discount_total: Mapped[int] = mapped_column(Integer, default=0)
    discount_reason: Mapped[str | None] = mapped_column(String(200))
    vat_total: Mapped[int] = mapped_column(Integer, default=0)  # IVA
    total: Mapped[int] = mapped_column(Integer)  # final amount
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )

    status: Mapped[DocumentStatus] = mapped_column(
        ENUM(DocumentStatus, name="document_status", create_type=True),
        default=DocumentStatus.ISSUED,
    )

    # Links
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL")
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("user_subscriptions.id", ondelete="SET NULL")
    )
    original_invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL")
    )  # for credit notes referencing the original invoice

    # Dates
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[str | None] = mapped_column(String(200))

    # PDF
    pdf_storage_key: Mapped[str | None] = mapped_column(String(500))

    # Relationships
    lines: Mapped[list["InvoiceLine"]] = relationship(
        back_populates="invoice", lazy="selectin", cascade="all, delete-orphan"
    )
    receipts: Mapped[list["Receipt"]] = relationship(
        back_populates="invoice", lazy="noload"
    )


class InvoiceLine(BaseModel):
    __tablename__ = "invoice_lines"

    invoice_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), index=True
    )
    line_number: Mapped[int] = mapped_column(SmallInteger)
    description: Mapped[str] = mapped_column(String(300))
    quantity: Mapped[int] = mapped_column(SmallInteger, default=1)
    unit_price: Mapped[int] = mapped_column(Integer)  # centavos
    discount_amount: Mapped[int] = mapped_column(Integer, default=0)
    vat_rate: Mapped[str] = mapped_column(String(10), default="exempt")  # "14" or "exempt"
    vat_exempt_reason: Mapped[str | None] = mapped_column(String(10))  # AGT code: M01, M02...
    vat_amount: Mapped[int] = mapped_column(Integer, default=0)
    line_total: Mapped[int] = mapped_column(Integer)  # (unit_price * qty - discount + vat)

    # Reference
    product_code: Mapped[str | None] = mapped_column(String(100))  # plan_id, addon_id
    product_type: Mapped[str | None] = mapped_column(String(30))  # subscription, addon, proration

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="lines")


class Receipt(BaseModel):
    __tablename__ = "receipts"
    __table_args__ = (
        UniqueConstraint("document_number", name="uq_receipt_document_number"),
        Index("idx_receipt_user", "user_id"),
    )

    document_number: Mapped[str] = mapped_column(String(30))  # "RC 2026/000001"
    series_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("document_series.id", ondelete="RESTRICT")
    )

    # AGT fields
    hash: Mapped[str] = mapped_column(String(200))
    hash_control: Mapped[str] = mapped_column(String(4))
    atcud: Mapped[str] = mapped_column(String(70))
    previous_hash: Mapped[str | None] = mapped_column(String(200))
    agt_sync_status: Mapped[AGTSyncStatus] = mapped_column(
        ENUM(AGTSyncStatus, name="agt_sync_status", create_type=True),
        default=AGTSyncStatus.PENDING,
    )

    # Links
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE")
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )

    amount: Mapped[int] = mapped_column(Integer)  # centavos
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    status: Mapped[DocumentStatus] = mapped_column(
        ENUM(DocumentStatus, name="document_status", create_type=True),
        default=DocumentStatus.ISSUED,
    )
    issue_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    payment_method_description: Mapped[str | None] = mapped_column(String(100))

    # PDF
    pdf_storage_key: Mapped[str | None] = mapped_column(String(500))

    # Relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="receipts")
