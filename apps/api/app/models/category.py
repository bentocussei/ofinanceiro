import uuid

from sqlalchemy import Boolean, ForeignKey, SmallInteger, String
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel
from app.models.enums import CategoryType


class Category(BaseModel):
    __tablename__ = "categories"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str | None] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(7))
    type: Mapped[CategoryType] = mapped_column(
        ENUM(CategoryType, name="category_type", create_type=True),
        default=CategoryType.EXPENSE,
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)

    # Relationships
    parent: Mapped["Category | None"] = relationship(
        remote_side="Category.id", foreign_keys=[parent_id], lazy="joined"
    )
    children: Mapped[list["Category"]] = relationship(
        foreign_keys=[parent_id], overlaps="parent", lazy="noload"
    )
