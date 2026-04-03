"""SAFT-T (AO) XML export for AGT compliance.

Generates SAF-T XML per Angola regulations (Portaria 415/2019, Decreto Presidencial 312/18).
Schema: SAFTAO1.01_01
"""

import logging
from datetime import datetime, timezone
from xml.etree.ElementTree import Element, SubElement, tostring

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import DocumentType
from app.models.invoice import Invoice, InvoiceLine
from app.models.user import User

logger = logging.getLogger(__name__)

COMPANY_NIF = "0000000000"
COMPANY_NAME = "O Financeiro, Lda"
COMPANY_ADDRESS = "Luanda"
COMPANY_COUNTRY = "AO"
SAFT_VERSION = "1.01_01"
CURRENCY = "AOA"
PRODUCT_ID = "O Financeiro/1.0"


def _format_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _format_datetime(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _format_amount(centavos: int) -> str:
    return f"{centavos / 100:.2f}"


async def export_saft_xml(
    db: AsyncSession,
    fiscal_year: int,
    start_month: int = 1,
    end_month: int = 12,
) -> bytes:
    """Generate SAFT-T XML for a fiscal year (or period).

    Returns UTF-8 encoded XML bytes.
    """
    now = datetime.now(timezone.utc)

    # Root element
    root = Element("AuditFile")
    root.set("xmlns", "urn:OECD:StandardAuditFile-Tax:AO_1.01_01")

    # Header
    header = SubElement(root, "Header")
    SubElement(header, "AuditFileVersion").text = SAFT_VERSION
    SubElement(header, "CompanyID").text = COMPANY_NIF
    SubElement(header, "TaxRegistrationNumber").text = COMPANY_NIF
    SubElement(header, "TaxAccountingBasis").text = "F"  # Facturacao
    SubElement(header, "CompanyName").text = COMPANY_NAME
    addr = SubElement(header, "CompanyAddress")
    SubElement(addr, "AddressDetail").text = COMPANY_ADDRESS
    SubElement(addr, "City").text = "Luanda"
    SubElement(addr, "Country").text = COMPANY_COUNTRY
    SubElement(header, "FiscalYear").text = str(fiscal_year)
    SubElement(header, "StartDate").text = f"{fiscal_year}-{start_month:02d}-01"
    SubElement(header, "EndDate").text = f"{fiscal_year}-{end_month:02d}-28"
    SubElement(header, "CurrencyCode").text = CURRENCY
    SubElement(header, "DateCreated").text = _format_date(now)
    SubElement(header, "TaxEntity").text = "Global"
    SubElement(header, "ProductCompanyTaxID").text = COMPANY_NIF
    SubElement(header, "SoftwareCertificateNumber").text = "0"
    SubElement(header, "ProductID").text = PRODUCT_ID
    SubElement(header, "ProductVersion").text = "1.0"

    # Fetch invoices for the period
    from_date = datetime(fiscal_year, start_month, 1, tzinfo=timezone.utc)
    if end_month == 12:
        to_date = datetime(fiscal_year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        to_date = datetime(fiscal_year, end_month + 1, 1, tzinfo=timezone.utc)

    result = await db.scalars(
        select(Invoice)
        .where(
            Invoice.issue_date >= from_date,
            Invoice.issue_date < to_date,
        )
        .order_by(Invoice.issue_date.asc())
    )
    invoices = list(result.all())

    # Collect unique customers
    customer_ids = {inv.user_id for inv in invoices}
    customers_el = SubElement(root, "MasterFiles")

    for uid in customer_ids:
        user = await db.get(User, uid)
        if not user:
            continue
        cust = SubElement(customers_el, "Customer")
        SubElement(cust, "CustomerID").text = str(uid)[:8]
        SubElement(cust, "AccountID").text = "Desconhecido"
        SubElement(cust, "CustomerTaxID").text = "999999990"  # consumidor final
        SubElement(cust, "CompanyName").text = user.name or "Consumidor Final"
        caddr = SubElement(cust, "BillingAddress")
        SubElement(caddr, "AddressDetail").text = "Desconhecido"
        SubElement(caddr, "City").text = "Desconhecido"
        SubElement(caddr, "Country").text = COMPANY_COUNTRY
        SubElement(cust, "SelfBillingIndicator").text = "0"

    # Source Documents
    source_docs = SubElement(root, "SourceDocuments")
    sales_invoices = SubElement(source_docs, "SalesInvoices")
    SubElement(sales_invoices, "NumberOfEntries").text = str(len(invoices))

    total_debit = sum(inv.total for inv in invoices if inv.document_type == DocumentType.CREDIT_NOTE)
    total_credit = sum(inv.total for inv in invoices if inv.document_type != DocumentType.CREDIT_NOTE)
    SubElement(sales_invoices, "TotalDebit").text = _format_amount(total_debit)
    SubElement(sales_invoices, "TotalCredit").text = _format_amount(total_credit)

    for inv in invoices:
        invoice_el = SubElement(sales_invoices, "Invoice")
        SubElement(invoice_el, "InvoiceNo").text = inv.document_number
        SubElement(invoice_el, "ATCUD").text = inv.atcud

        doc_status = SubElement(invoice_el, "DocumentStatus")
        status_map = {"issued": "N", "cancelled": "A", "draft": "R"}
        SubElement(doc_status, "InvoiceStatus").text = status_map.get(inv.status.value, "N")
        SubElement(doc_status, "InvoiceStatusDate").text = _format_datetime(inv.issue_date)
        SubElement(doc_status, "SourceID").text = "Sistema"
        SubElement(doc_status, "SourceBilling").text = "P"

        SubElement(invoice_el, "Hash").text = inv.hash
        SubElement(invoice_el, "HashControl").text = inv.hash_control
        SubElement(invoice_el, "InvoiceDate").text = _format_date(inv.issue_date)

        type_map = {"FT": "FT", "NC": "NC", "RC": "RC"}
        SubElement(invoice_el, "InvoiceType").text = type_map.get(inv.document_type.value, "FT")
        SubElement(invoice_el, "SourceID").text = "Sistema"
        SubElement(invoice_el, "SystemEntryDate").text = _format_datetime(inv.created_at)
        SubElement(invoice_el, "CustomerID").text = str(inv.user_id)[:8]

        # Lines
        for line in inv.lines:
            line_el = SubElement(invoice_el, "Line")
            SubElement(line_el, "LineNumber").text = str(line.line_number)
            if inv.document_type == DocumentType.CREDIT_NOTE:
                SubElement(line_el, "DebitAmount").text = _format_amount(line.line_total)
            else:
                SubElement(line_el, "CreditAmount").text = _format_amount(line.line_total)
            SubElement(line_el, "Description").text = line.description
            SubElement(line_el, "Quantity").text = str(line.quantity)
            SubElement(line_el, "UnitPrice").text = _format_amount(line.unit_price)

            tax = SubElement(line_el, "Tax")
            SubElement(tax, "TaxType").text = "IVA"
            SubElement(tax, "TaxCountryRegion").text = COMPANY_COUNTRY
            if line.vat_rate == "exempt":
                SubElement(tax, "TaxPercentage").text = "0"
                SubElement(line_el, "TaxExemptionReason").text = "Isento Art. 12"
                SubElement(line_el, "TaxExemptionCode").text = line.vat_exempt_reason or "M01"
            else:
                SubElement(tax, "TaxPercentage").text = line.vat_rate
            SubElement(tax, "TaxAmount").text = _format_amount(line.vat_amount)

        # DocumentTotals
        totals = SubElement(invoice_el, "DocumentTotals")
        SubElement(totals, "TaxPayable").text = _format_amount(inv.vat_total)
        SubElement(totals, "NetTotal").text = _format_amount(inv.subtotal - inv.discount_total)
        SubElement(totals, "GrossTotal").text = _format_amount(inv.total)
        SubElement(totals, "Currency").text = CURRENCY

    # Serialize to XML bytes
    xml_bytes = tostring(root, encoding="utf-8", xml_declaration=True)
    logger.info("SAFT-T exportado: %d facturas, ano fiscal %d", len(invoices), fiscal_year)
    return xml_bytes
