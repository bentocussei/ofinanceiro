"""Document series model — sequential numbering per document type per fiscal year (AGT compliance)."""

from sqlalchemy import Boolean, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel
from app.models.enums import DocumentType


class DocumentSeries(BaseModel):
    __tablename__ = "document_series"
    __table_args__ = (
        UniqueConstraint("document_type", "fiscal_year", name="uq_series_type_year"),
    )

    document_type: Mapped[DocumentType] = mapped_column(
        ENUM(DocumentType, name="document_type", create_type=True)
    )
    fiscal_year: Mapped[int] = mapped_column(Integer)
    prefix: Mapped[str] = mapped_column(String(20))  # e.g. "FT 2026/"
    last_number: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
