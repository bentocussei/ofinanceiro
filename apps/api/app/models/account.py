import uuid

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import AccountType, AccountUsageType, CurrencyCode


class Account(BaseModel):
    __tablename__ = "accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # family_id FK will be added in Phase 4 when families table is created
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[AccountType] = mapped_column(
        ENUM(AccountType, name="account_type", create_type=True)
    )
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )
    # Balance in centavos (integer) to avoid float precision issues
    balance: Mapped[int] = mapped_column(BigInteger, default=0)
    icon: Mapped[str | None] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(7))
    institution: Mapped[str | None] = mapped_column(String(100))
    account_number: Mapped[str | None] = mapped_column(Text)
    # Limite de crédito em centavos (para cartões de crédito)
    credit_limit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    # Alerta de saldo baixo em centavos
    low_balance_alert: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    usage_type: Mapped[AccountUsageType | None] = mapped_column(
        ENUM(AccountUsageType, name="account_usage_type", create_type=True), nullable=True
    )
    # Dados bancários
    iban: Mapped[str | None] = mapped_column(String(34), nullable=True)
    nib: Mapped[str | None] = mapped_column(String(21), nullable=True)
    swift_code: Mapped[str | None] = mapped_column(String(11), nullable=True)
    account_holder: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="accounts")  # noqa: F821
    transactions: Mapped[list["Transaction"]] = relationship(  # noqa: F821
        back_populates="account",
        lazy="noload",
        foreign_keys="[Transaction.account_id]",
    )
