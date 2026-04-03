"""Invoicing service: AGT-compliant invoice and receipt generation.

Handles document numbering, hash chain (SHA-256), ATCUD, QR code,
invoice/receipt creation, and credit notes.
"""

import base64
import hashlib
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import (
    AGTSyncStatus,
    CurrencyCode,
    DocumentStatus,
    DocumentType,
)
from app.models.document_series import DocumentSeries
from app.models.invoice import Invoice, InvoiceLine, Receipt
from app.models.payment import Payment
from app.models.subscription import UserSubscription
from app.models.user import User

logger = logging.getLogger(__name__)

# O Financeiro company details for QR code / SAFT
COMPANY_NIF = "0000000000"  # TODO: set real NIF after registration
COMPANY_NAME = "O Financeiro, Lda"
COMPANY_COUNTRY = "AO"

# IVA rate for digital services in Angola (currently exempt for most SaaS)
DEFAULT_VAT_RATE = "exempt"
DEFAULT_VAT_EXEMPT_REASON = "M01"  # Artigo 12.o do CIVA — prestacao de servicos digitais


# ---------------------------------------------------------------------------
# Document series & numbering
# ---------------------------------------------------------------------------

async def get_or_create_series(
    db: AsyncSession,
    doc_type: DocumentType,
    fiscal_year: int | None = None,
) -> DocumentSeries:
    """Get or create a document series for the given type and fiscal year."""
    if fiscal_year is None:
        fiscal_year = datetime.now(timezone.utc).year

    result = await db.scalar(
        select(DocumentSeries).where(
            DocumentSeries.document_type == doc_type,
            DocumentSeries.fiscal_year == fiscal_year,
            DocumentSeries.is_active.is_(True),
        ).with_for_update()
    )

    if result:
        return result

    prefix = f"{doc_type.value} {fiscal_year}/"
    series = DocumentSeries(
        document_type=doc_type,
        fiscal_year=fiscal_year,
        prefix=prefix,
        last_number=0,
        is_active=True,
    )
    db.add(series)
    await db.flush()
    return series


async def get_next_document_number(
    db: AsyncSession,
    doc_type: DocumentType,
) -> tuple[DocumentSeries, str]:
    """Atomically get the next document number for a series.

    Returns (series, document_number) e.g. (series, "FT 2026/000001").
    Uses SELECT FOR UPDATE to prevent duplicates.
    """
    series = await get_or_create_series(db, doc_type)
    series.last_number += 1
    number = series.last_number
    document_number = f"{series.prefix}{number:06d}"
    await db.flush()
    return series, document_number


# ---------------------------------------------------------------------------
# AGT hash chain
# ---------------------------------------------------------------------------

def generate_document_hash(
    issue_date: datetime,
    document_number: str,
    gross_total: int,
    previous_hash: str | None,
) -> tuple[str, str]:
    """Generate AGT-compliant document hash.

    Hash = SHA-256(Date;SystemDate;DocumentNumber;GrossTotal;PreviousHash)

    Returns (full_hash_base64, hash_control_4chars).
    """
    date_str = issue_date.strftime("%Y-%m-%d")
    system_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    total_str = f"{gross_total / 100:.2f}"  # convert centavos to Kz with 2 decimals
    prev = previous_hash or ""

    data = f"{date_str};{system_date_str};{document_number};{total_str};{prev}"
    hash_bytes = hashlib.sha256(data.encode("utf-8")).digest()
    full_hash = base64.b64encode(hash_bytes).decode("ascii")

    # Hash control: positions 0, 10, 20, 30 of the base64 string
    control = ""
    for i in [0, 10, 20, 30]:
        if i < len(full_hash):
            control += full_hash[i]
    return full_hash, control


def generate_atcud(series_prefix: str, sequential_number: int) -> str:
    """Generate ATCUD (Codigo Unico de Documento).

    Format: {validation_code}-{sequential_number}
    The validation_code is derived from the series.
    """
    # Generate a deterministic 8-char code from the series prefix
    prefix_hash = hashlib.md5(series_prefix.encode()).hexdigest()[:8].upper()
    return f"{prefix_hash}-{sequential_number}"


def generate_qr_code_data(
    invoice: Invoice,
    hash_control: str,
    atcud: str,
) -> str:
    """Generate QR code data string per AGT specification."""
    fields = [
        f"A:{COMPANY_NIF}",
        f"B:{invoice.customer_nif or '999999990'}",
        f"C:{COMPANY_COUNTRY}",
        f"D:{invoice.document_type.value}",
        f"E:N",  # N = normal status
        f"F:{invoice.issue_date.strftime('%Y%m%d')}",
        f"G:{invoice.document_number}",
        f"H:{atcud}",
        f"I1:{invoice.subtotal / 100:.2f}",
        f"N:{invoice.vat_total / 100:.2f}",
        f"O:{invoice.total / 100:.2f}",
        f"Q:{hash_control}",
        f"R:0",  # certificate number (0 = demo)
    ]
    return "*".join(fields)


async def get_previous_hash(
    db: AsyncSession,
    doc_type: DocumentType,
    series_id: uuid.UUID,
) -> str | None:
    """Get the hash of the most recent document in this series (for chain)."""
    result = await db.scalar(
        select(Invoice.hash)
        .where(
            Invoice.document_type == doc_type,
            Invoice.series_id == series_id,
        )
        .order_by(Invoice.created_at.desc())
        .limit(1)
    )
    if result:
        return result

    # Also check receipts if doc_type is RC
    if doc_type == DocumentType.RECEIPT:
        result = await db.scalar(
            select(Receipt.hash)
            .where(Receipt.series_id == series_id)
            .order_by(Receipt.created_at.desc())
            .limit(1)
        )
    return result


# ---------------------------------------------------------------------------
# Invoice creation
# ---------------------------------------------------------------------------

async def create_invoice_for_payment(
    db: AsyncSession,
    payment: Payment,
    subscription: UserSubscription | None = None,
) -> Invoice:
    """Create an invoice (FT) for a completed payment.

    Generates: document number, hash, ATCUD, QR code, and invoice lines.
    """
    user = await db.get(User, payment.user_id)
    if not user:
        raise ValueError(f"User {payment.user_id} not found")

    now = datetime.now(timezone.utc)
    doc_type = DocumentType.INVOICE

    # Get next number
    series, doc_number = await get_next_document_number(db, doc_type)

    # Get previous hash for chain
    prev_hash = await get_previous_hash(db, doc_type, series.id)

    # Generate AGT fields
    full_hash, hash_control = generate_document_hash(
        now, doc_number, payment.amount, prev_hash
    )
    atcud = generate_atcud(series.prefix, series.last_number)

    # Build invoice
    invoice = Invoice(
        document_type=doc_type,
        document_number=doc_number,
        series_id=series.id,
        hash=full_hash,
        hash_control=hash_control,
        atcud=atcud,
        previous_hash=prev_hash,
        agt_sync_status=AGTSyncStatus.PENDING,
        user_id=payment.user_id,
        customer_name=user.name or "Consumidor Final",
        customer_nif=None,  # users can add NIF later
        customer_email=user.email,
        customer_phone=user.phone,
        subtotal=payment.amount,
        discount_total=0,
        vat_total=0,
        total=payment.amount,
        currency=payment.currency,
        status=DocumentStatus.ISSUED,
        payment_id=payment.id,
        subscription_id=payment.subscription_id,
        issue_date=now,
        due_date=now,  # already paid
    )

    # Add discount info if subscription has one
    if subscription and subscription.discount_amount > 0:
        # The payment amount already has discount applied, show original + discount
        original_amount = payment.amount + subscription.discount_amount
        invoice.subtotal = original_amount
        invoice.discount_total = subscription.discount_amount
        invoice.total = payment.amount
        promo_name = ""
        if subscription.promotion_id:
            from app.models.promotion import Promotion
            promo = await db.get(Promotion, subscription.promotion_id)
            if promo:
                promo_name = promo.name
        invoice.discount_reason = promo_name or "Desconto aplicado"

    # QR code
    invoice.qr_code_data = generate_qr_code_data(invoice, hash_control, atcud)

    db.add(invoice)
    await db.flush()

    # Create invoice lines
    lines = _build_invoice_lines(payment, subscription, invoice.id)
    for line in lines:
        db.add(line)
    await db.flush()

    await db.refresh(invoice)
    logger.info("Factura %s criada para pagamento %s", doc_number, payment.id)
    return invoice


def _build_invoice_lines(
    payment: Payment,
    subscription: UserSubscription | None,
    invoice_id: uuid.UUID,
) -> list[InvoiceLine]:
    """Build invoice line items based on the payment context."""
    lines: list[InvoiceLine] = []
    line_num = 1

    if subscription:
        snapshot = subscription.plan_snapshot or {}
        plan_name = snapshot.get("name", "Subscricao")
        cycle_label = "Mensal" if subscription.billing_cycle.value == "monthly" else "Anual"

        # Main subscription line
        base = subscription.base_price
        lines.append(InvoiceLine(
            invoice_id=invoice_id,
            line_number=line_num,
            description=f"Plano {plan_name} — {cycle_label}",
            quantity=1,
            unit_price=base,
            discount_amount=subscription.discount_amount,
            vat_rate=DEFAULT_VAT_RATE,
            vat_exempt_reason=DEFAULT_VAT_EXEMPT_REASON,
            vat_amount=0,
            line_total=max(0, base - subscription.discount_amount),
            product_code=str(subscription.plan_id) if subscription.plan_id else None,
            product_type="subscription",
        ))
        line_num += 1

        # Extra members line
        if subscription.extra_members_cost > 0:
            lines.append(InvoiceLine(
                invoice_id=invoice_id,
                line_number=line_num,
                description=f"Membros extra ({subscription.extra_members_count})",
                quantity=subscription.extra_members_count,
                unit_price=subscription.extra_members_cost // max(1, subscription.extra_members_count),
                discount_amount=0,
                vat_rate=DEFAULT_VAT_RATE,
                vat_exempt_reason=DEFAULT_VAT_EXEMPT_REASON,
                vat_amount=0,
                line_total=subscription.extra_members_cost,
                product_type="extra_members",
            ))
            line_num += 1

        # Add-ons line
        if subscription.module_addons_cost > 0:
            lines.append(InvoiceLine(
                invoice_id=invoice_id,
                line_number=line_num,
                description="Modulos adicionais",
                quantity=1,
                unit_price=subscription.module_addons_cost,
                discount_amount=0,
                vat_rate=DEFAULT_VAT_RATE,
                vat_exempt_reason=DEFAULT_VAT_EXEMPT_REASON,
                vat_amount=0,
                line_total=subscription.module_addons_cost,
                product_type="addon",
            ))
            line_num += 1

        # Proration line (if applicable)
        if subscription.proration_credit > 0:
            lines.append(InvoiceLine(
                invoice_id=invoice_id,
                line_number=line_num,
                description="Credito de prorateio (plano anterior)",
                quantity=1,
                unit_price=0,
                discount_amount=subscription.proration_credit,
                vat_rate=DEFAULT_VAT_RATE,
                vat_exempt_reason=DEFAULT_VAT_EXEMPT_REASON,
                vat_amount=0,
                line_total=-subscription.proration_credit,
                product_type="proration",
            ))
            line_num += 1
    else:
        # Generic payment line
        lines.append(InvoiceLine(
            invoice_id=invoice_id,
            line_number=line_num,
            description=payment.description or "Pagamento",
            quantity=1,
            unit_price=payment.amount,
            discount_amount=0,
            vat_rate=DEFAULT_VAT_RATE,
            vat_exempt_reason=DEFAULT_VAT_EXEMPT_REASON,
            vat_amount=0,
            line_total=payment.amount,
            product_type=payment.payment_type.value if hasattr(payment.payment_type, "value") else str(payment.payment_type),
        ))

    return lines


# ---------------------------------------------------------------------------
# Receipt creation
# ---------------------------------------------------------------------------

async def create_receipt_for_payment(
    db: AsyncSession,
    payment: Payment,
    invoice: Invoice,
) -> Receipt:
    """Create a receipt (RC) for a confirmed payment linked to an invoice."""
    now = datetime.now(timezone.utc)
    doc_type = DocumentType.RECEIPT

    series, doc_number = await get_next_document_number(db, doc_type)
    prev_hash = await get_previous_hash(db, doc_type, series.id)

    full_hash, hash_control = generate_document_hash(
        now, doc_number, payment.amount, prev_hash
    )
    atcud = generate_atcud(series.prefix, series.last_number)

    # Payment method description
    pm_desc: str | None = None
    if payment.payment_method_id:
        from app.models.payment_method import PaymentMethod
        pm = await db.get(PaymentMethod, payment.payment_method_id)
        if pm:
            pm_desc = pm.label

    receipt = Receipt(
        document_number=doc_number,
        series_id=series.id,
        hash=full_hash,
        hash_control=hash_control,
        atcud=atcud,
        previous_hash=prev_hash,
        agt_sync_status=AGTSyncStatus.PENDING,
        invoice_id=invoice.id,
        payment_id=payment.id,
        user_id=payment.user_id,
        amount=payment.amount,
        currency=payment.currency,
        status=DocumentStatus.ISSUED,
        issue_date=now,
        payment_method_description=pm_desc,
    )
    db.add(receipt)
    await db.flush()
    await db.refresh(receipt)

    logger.info("Recibo %s criado para factura %s", doc_number, invoice.document_number)
    return receipt


# ---------------------------------------------------------------------------
# Credit notes
# ---------------------------------------------------------------------------

async def create_credit_note(
    db: AsyncSession,
    original_invoice_id: uuid.UUID,
    reason: str,
    amount: int | None = None,
) -> Invoice:
    """Create a credit note (NC) referencing an original invoice.

    If amount is None, credits the full invoice total.
    """
    original = await db.get(Invoice, original_invoice_id)
    if not original:
        raise ValueError("Factura original nao encontrada")

    credit_amount = amount if amount is not None else original.total
    now = datetime.now(timezone.utc)
    doc_type = DocumentType.CREDIT_NOTE

    series, doc_number = await get_next_document_number(db, doc_type)
    prev_hash = await get_previous_hash(db, doc_type, series.id)
    full_hash, hash_control = generate_document_hash(
        now, doc_number, credit_amount, prev_hash
    )
    atcud = generate_atcud(series.prefix, series.last_number)

    credit_note = Invoice(
        document_type=doc_type,
        document_number=doc_number,
        series_id=series.id,
        hash=full_hash,
        hash_control=hash_control,
        atcud=atcud,
        previous_hash=prev_hash,
        agt_sync_status=AGTSyncStatus.PENDING,
        user_id=original.user_id,
        customer_name=original.customer_name,
        customer_nif=original.customer_nif,
        customer_email=original.customer_email,
        customer_phone=original.customer_phone,
        subtotal=credit_amount,
        discount_total=0,
        vat_total=0,
        total=credit_amount,
        currency=original.currency,
        status=DocumentStatus.ISSUED,
        original_invoice_id=original_invoice_id,
        issue_date=now,
    )
    credit_note.qr_code_data = generate_qr_code_data(credit_note, hash_control, atcud)
    db.add(credit_note)
    await db.flush()

    # Single line for the credit
    line = InvoiceLine(
        invoice_id=credit_note.id,
        line_number=1,
        description=f"Nota de credito ref. {original.document_number} — {reason}",
        quantity=1,
        unit_price=credit_amount,
        discount_amount=0,
        vat_rate=DEFAULT_VAT_RATE,
        vat_exempt_reason=DEFAULT_VAT_EXEMPT_REASON,
        vat_amount=0,
        line_total=credit_amount,
        product_type="credit_note",
    )
    db.add(line)
    await db.flush()
    await db.refresh(credit_note)

    logger.info("Nota de credito %s criada ref. %s", doc_number, original.document_number)
    return credit_note


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

async def list_user_invoices(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Invoice]:
    result = await db.scalars(
        select(Invoice)
        .where(Invoice.user_id == user_id)
        .order_by(Invoice.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.all())


async def list_user_receipts(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
    offset: int = 0,
) -> list[Receipt]:
    result = await db.scalars(
        select(Receipt)
        .where(Receipt.user_id == user_id)
        .order_by(Receipt.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.all())


async def list_all_invoices(
    db: AsyncSession,
    doc_type: DocumentType | None = None,
    status: DocumentStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Invoice]:
    stmt = select(Invoice)
    if doc_type:
        stmt = stmt.where(Invoice.document_type == doc_type)
    if status:
        stmt = stmt.where(Invoice.status == status)
    stmt = stmt.order_by(Invoice.created_at.desc()).limit(limit).offset(offset)
    result = await db.scalars(stmt)
    return list(result.all())
