"""Module add-on — grants access to all features of a specific module."""

from sqlalchemy import BigInteger, Boolean, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class ModuleAddon(BaseModel):
    __tablename__ = "module_addons"

    name: Mapped[str] = mapped_column(String(100))
    module: Mapped[str] = mapped_column(String(50))  # e.g. "ocr", "ai", "voice"
    description: Mapped[str | None] = mapped_column(Text)
    price_monthly: Mapped[int] = mapped_column(BigInteger)  # centavos
    price_annual: Mapped[int] = mapped_column(BigInteger)  # centavos
    features_override: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)
