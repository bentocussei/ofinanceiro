import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    Double,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import TransactionType


class Transaction(BaseModel):
    __tablename__ = "transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT")
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL")
    )

    # Amount in centavos (integer)
    amount: Mapped[int] = mapped_column(Integer)
    type: Mapped[TransactionType] = mapped_column()
    description: Mapped[str | None] = mapped_column(Text)
    merchant: Mapped[str | None] = mapped_column(Text)

    # Location (optional)
    latitude: Mapped[float | None] = mapped_column(Double)
    longitude: Mapped[float | None] = mapped_column(Double)

    # Anexos
    attachments: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    # Conta destino (para transferências)
    to_account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True
    )

    # Metadata
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_rule: Mapped[dict | None] = mapped_column(JSONB)

    # Family
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column()

    notes: Mapped[str | None] = mapped_column(Text)

    # Dates
    transaction_date: Mapped[date] = mapped_column(Date, default=date.today)

    # Offline sync
    client_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    synced_at: Mapped[datetime | None] = mapped_column()

    # Relationships
    user: Mapped["User"] = relationship(  # noqa: F821
        back_populates="transactions", foreign_keys=[user_id]
    )
    account: Mapped["Account"] = relationship(  # noqa: F821
        back_populates="transactions", foreign_keys=[account_id]
    )
    category: Mapped["Category | None"] = relationship(lazy="joined")  # noqa: F821

    __table_args__ = (
        Index("idx_txn_user_date", "user_id", transaction_date.desc()),
        Index("idx_txn_account", "account_id", transaction_date.desc()),
        Index("idx_txn_category", "category_id", transaction_date.desc()),
        Index("idx_txn_user_category_date", "user_id", "category_id", transaction_date.desc()),
        UniqueConstraint("user_id", "client_id", name="uq_txn_client_id"),
    )
