"""PDF generation for invoices and receipts using ReportLab."""

import io
import logging
from datetime import datetime

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.invoice import Invoice, InvoiceLine, Receipt

logger = logging.getLogger(__name__)

COMPANY_NAME = "O Financeiro, Lda"
COMPANY_ADDRESS = "Luanda, Angola"
COMPANY_NIF = "0000000000"
COMPANY_EMAIL = "suporte@ofinanceiro.app"


def _format_kz(centavos: int) -> str:
    """Format centavos as Kz string."""
    value = centavos / 100
    if value == int(value):
        return f"{int(value):,} Kz".replace(",", ".")
    return f"{value:,.2f} Kz".replace(",", "X").replace(".", ",").replace("X", ".")


def _format_date(dt: datetime) -> str:
    return dt.strftime("%d/%m/%Y")


def _generate_qr_image(data: str) -> io.BytesIO:
    """Generate QR code image as BytesIO."""
    qr = qrcode.QRCode(version=1, box_size=4, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def generate_invoice_pdf(invoice: Invoice, lines: list[InvoiceLine]) -> bytes:
    """Generate a PDF for an invoice (FT or NC). Returns PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=16, spaceAfter=6)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=9, textColor=colors.grey)
    normal_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10)
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    doc_type_labels = {"FT": "FACTURA", "NC": "NOTA DE CREDITO", "RC": "RECIBO"}
    doc_label = doc_type_labels.get(invoice.document_type.value, "DOCUMENTO")

    elements: list = []

    # Header
    elements.append(Paragraph(COMPANY_NAME, title_style))
    elements.append(Paragraph(f"NIF: {COMPANY_NIF} | {COMPANY_ADDRESS}", subtitle_style))
    elements.append(Paragraph(f"{COMPANY_EMAIL}", subtitle_style))
    elements.append(Spacer(1, 8 * mm))

    # Document title
    elements.append(Paragraph(f"{doc_label} {invoice.document_number}", ParagraphStyle(
        "DocTitle", parent=styles["Heading2"], fontSize=14, textColor=colors.HexColor("#1a1a1a")
    )))
    elements.append(Spacer(1, 4 * mm))

    # Document info table
    info_data = [
        ["Data de emissao:", _format_date(invoice.issue_date)],
        ["Estado:", "Emitida"],
        ["ATCUD:", invoice.atcud],
    ]
    if invoice.original_invoice_id:
        info_data.append(["Ref. factura original:", str(invoice.original_invoice_id)[:8] + "..."])

    info_table = Table(info_data, colWidths=[4 * cm, 10 * cm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # Customer
    elements.append(Paragraph("CLIENTE", ParagraphStyle(
        "SectionTitle", parent=styles["Normal"], fontSize=10, textColor=colors.grey, spaceAfter=2
    )))
    elements.append(Paragraph(invoice.customer_name or "Consumidor Final", normal_style))
    if invoice.customer_nif:
        elements.append(Paragraph(f"NIF: {invoice.customer_nif}", small_style))
    if invoice.customer_phone:
        elements.append(Paragraph(f"Tel: {invoice.customer_phone}", small_style))
    if invoice.customer_email:
        elements.append(Paragraph(f"Email: {invoice.customer_email}", small_style))
    elements.append(Spacer(1, 6 * mm))

    # Line items table
    header = ["#", "Descricao", "Qtd", "Preco Unit.", "Desconto", "IVA", "Total"]
    table_data = [header]

    for line in lines:
        table_data.append([
            str(line.line_number),
            line.description,
            str(line.quantity),
            _format_kz(line.unit_price),
            _format_kz(line.discount_amount) if line.discount_amount else "-",
            line.vat_rate if line.vat_rate != "exempt" else "Isento",
            _format_kz(line.line_total),
        ])

    col_widths = [1 * cm, 7 * cm, 1.5 * cm, 2.5 * cm, 2 * cm, 1.5 * cm, 2.5 * cm]
    items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f5")),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#666666")),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#e0e0e0")),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#e0e0e0")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 6 * mm))

    # Totals
    totals_data = [
        ["Subtotal:", _format_kz(invoice.subtotal)],
    ]
    if invoice.discount_total > 0:
        reason = f" ({invoice.discount_reason})" if invoice.discount_reason else ""
        totals_data.append([f"Desconto{reason}:", f"-{_format_kz(invoice.discount_total)}"])
    if invoice.vat_total > 0:
        totals_data.append(["IVA:", _format_kz(invoice.vat_total)])
    else:
        totals_data.append(["IVA:", "Isento (M01)"])
    totals_data.append(["TOTAL:", _format_kz(invoice.total)])

    totals_table = Table(totals_data, colWidths=[14 * cm, 4 * cm])
    totals_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.HexColor("#1a1a1a")),
        ("TOPPADDING", (0, -1), (-1, -1), 6),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 8 * mm))

    # AGT compliance footer
    elements.append(Paragraph(f"Hash: {invoice.hash_control}", small_style))
    elements.append(Paragraph(f"ATCUD: {invoice.atcud}", small_style))
    elements.append(Paragraph("Documento processado por computador", small_style))

    # QR Code
    if invoice.qr_code_data:
        elements.append(Spacer(1, 4 * mm))
        qr_buf = _generate_qr_image(invoice.qr_code_data)
        qr_img = Image(qr_buf, width=3 * cm, height=3 * cm)
        elements.append(qr_img)

    doc.build(elements)
    return buf.getvalue()


def generate_receipt_pdf(receipt: Receipt, invoice: Invoice) -> bytes:
    """Generate a PDF for a receipt (RC). Returns PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=16, spaceAfter=6)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=9, textColor=colors.grey)
    normal_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10)
    small_style = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    elements: list = []

    # Header
    elements.append(Paragraph(COMPANY_NAME, title_style))
    elements.append(Paragraph(f"NIF: {COMPANY_NIF} | {COMPANY_ADDRESS}", subtitle_style))
    elements.append(Spacer(1, 8 * mm))

    # Receipt title
    elements.append(Paragraph(f"RECIBO {receipt.document_number}", ParagraphStyle(
        "DocTitle", parent=styles["Heading2"], fontSize=14
    )))
    elements.append(Spacer(1, 4 * mm))

    # Info
    info_data = [
        ["Data:", _format_date(receipt.issue_date)],
        ["ATCUD:", receipt.atcud],
        ["Factura ref.:", invoice.document_number],
        ["Metodo de pagamento:", receipt.payment_method_description or "-"],
    ]
    info_table = Table(info_data, colWidths=[5 * cm, 10 * cm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    # Customer
    elements.append(Paragraph(f"Recebido de: {invoice.customer_name}", normal_style))
    if invoice.customer_nif:
        elements.append(Paragraph(f"NIF: {invoice.customer_nif}", small_style))
    elements.append(Spacer(1, 6 * mm))

    # Amount
    elements.append(Paragraph(f"Valor recebido: {_format_kz(receipt.amount)}", ParagraphStyle(
        "Amount", parent=styles["Normal"], fontSize=14, fontName="Helvetica-Bold"
    )))
    elements.append(Spacer(1, 8 * mm))

    # Footer
    elements.append(Paragraph(f"Hash: {receipt.hash_control}", small_style))
    elements.append(Paragraph(f"ATCUD: {receipt.atcud}", small_style))
    elements.append(Paragraph("Documento processado por computador", small_style))

    doc.build(elements)
    return buf.getvalue()
