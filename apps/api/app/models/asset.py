"""Physical/tangible asset model."""

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import AssetType, CurrencyCode


class Asset(BaseModel):
    __tablename__ = "assets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    family_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("families.id", ondelete="SET NULL"), default=None
    )
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[AssetType] = mapped_column(
        ENUM(AssetType, name="asset_type", create_type=True)
    )
    description: Mapped[str | None] = mapped_column(Text, default=None)

    # Valuation
    purchase_price: Mapped[int] = mapped_column(BigInteger)  # centavos
    purchase_date: Mapped[date | None] = mapped_column(Date, default=None)
    current_value: Mapped[int] = mapped_column(BigInteger)  # centavos
    last_valuation_date: Mapped[date | None] = mapped_column(Date, default=None)
    currency: Mapped[CurrencyCode] = mapped_column(
        ENUM(CurrencyCode, name="currency_code", create_type=True),
        default=CurrencyCode.AOA,
    )

    # Depreciation/Appreciation (basis points: +500 = +5%, -1500 = -15%)
    annual_change_rate: Mapped[int | None] = mapped_column(Integer, default=None)

    # Type-specific details stored as JSONB
    # real_estate: { address, area_sqm, bedrooms, parking }
    # vehicle: { brand, model, year, plate, km }
    # business_equity: { business_name, ownership_pct }
    details: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    # Linked financial items
    linked_debt_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("debts.id", ondelete="SET NULL"), default=None
    )
    linked_account_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), default=None
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    sold_price: Mapped[int | None] = mapped_column(BigInteger, default=None)  # centavos

    # Insurance
    is_insured: Mapped[bool] = mapped_column(Boolean, default=False)
    insurance_value: Mapped[int | None] = mapped_column(BigInteger, default=None)  # centavos
    insurance_expiry: Mapped[date | None] = mapped_column(Date, default=None)

    notes: Mapped[str | None] = mapped_column(Text, default=None)

    __table_args__ = (
        Index("idx_assets_user_active", "user_id", "is_active"),
        Index("idx_assets_user_type", "user_id", "type"),
    )
