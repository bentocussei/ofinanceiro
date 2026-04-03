"""Billing router: subscription management, plans, promotions, add-ons, payments."""

import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.enums import (
    PaymentGatewayType,
    PaymentStatus,
    SubscriptionStatus,
)
from app.models.plan import Plan
from app.models.subscription import UserSubscription
from app.models.user import User
from app.schemas.billing import (
    ChangePlanRequest,
    ModuleAddonResponse,
    PlanResponse,
    PriceBreakdown,
    SubscribeRequest,
    SubscriptionResponse,
    UpgradeRequest,
)
from app.services import billing as billing_service
from app.services import payment as payment_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _sub_to_response(db: AsyncSession, sub: UserSubscription, features: dict) -> SubscriptionResponse:
    """Convert a UserSubscription model to a SubscriptionResponse schema."""
    snapshot = sub.plan_snapshot or {}

    pending_plan_name: str | None = None
    pending_cycle: str | None = None
    pending_date: str | None = None
    if sub.pending_plan_id:
        pending_plan = await db.get(Plan, sub.pending_plan_id)
        if pending_plan:
            pending_plan_name = pending_plan.name
        pending_cycle = sub.pending_billing_cycle.value if sub.pending_billing_cycle else None
        pending_date = sub.end_date.isoformat()

    return SubscriptionResponse(
        id=str(sub.id),
        plan_type=snapshot.get("type", ""),
        plan_name=snapshot.get("name", ""),
        billing_cycle=sub.billing_cycle,
        status=sub.status.value if hasattr(sub.status, "value") else str(sub.status),
        base_price=sub.base_price,
        discount_amount=sub.discount_amount,
        extra_members_count=sub.extra_members_count,
        extra_members_cost=sub.extra_members_cost,
        module_addons_cost=sub.module_addons_cost,
        final_price=sub.final_price,
        start_date=sub.start_date.isoformat(),
        end_date=sub.end_date.isoformat(),
        trial_end_date=sub.trial_end_date.isoformat() if sub.trial_end_date else None,
        auto_renew=sub.auto_renew,
        proration_credit=sub.proration_credit or 0,
        pending_plan_name=pending_plan_name,
        pending_billing_cycle=pending_cycle,
        pending_change_date=pending_date,
        features=features,
    )


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------

@router.get("/plans", response_model=list[PlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db),
) -> list[PlanResponse]:
    """Listar todos os planos activos."""
    plans = await billing_service.list_active_plans(db)
    return [
        PlanResponse(
            id=str(p.id),
            type=p.type,
            name=p.name,
            description=p.description,
            base_price_monthly=p.base_price_monthly,
            base_price_annual=p.base_price_annual,
            currency=p.currency.value if hasattr(p.currency, "value") else str(p.currency),
            max_family_members=p.max_family_members,
            extra_member_cost=p.extra_member_cost,
            features=p.features or {},
            is_active=p.is_active,
            sort_order=p.sort_order,
        )
        for p in plans
    ]


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> PlanResponse:
    """Obter detalhes de um plano específico."""
    plan = await billing_service._get_plan_or_404(db, plan_id)
    return PlanResponse(
        id=str(plan.id),
        type=plan.type,
        name=plan.name,
        description=plan.description,
        base_price_monthly=plan.base_price_monthly,
        base_price_annual=plan.base_price_annual,
        currency=plan.currency.value if hasattr(plan.currency, "value") else str(plan.currency),
        max_family_members=plan.max_family_members,
        extra_member_cost=plan.extra_member_cost,
        features=plan.features or {},
        is_active=plan.is_active,
        sort_order=plan.sort_order,
    )


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------

@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse | None:
    """Obter a subscrição activa do utilizador."""
    sub = await billing_service.get_active_subscription(db, user.id)
    if not sub:
        return None

    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe(
    data: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Subscrever a um plano."""
    sub = await billing_service.subscribe(
        db,
        user_id=user.id,
        plan_id=data.plan_id,
        billing_cycle=data.billing_cycle,
        promo_code=data.promo_code,
    )
    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


@router.post("/preview-price", response_model=PriceBreakdown)
async def preview_price(
    data: SubscribeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PriceBreakdown:
    """Calcular o preço sem criar subscrição."""
    plan = await billing_service._get_plan_or_404(db, data.plan_id)

    promotion = None
    if data.promo_code:
        plan_type = plan.type.value if hasattr(plan.type, "value") else str(plan.type)
        promotion = await billing_service.validate_promotion(db, data.promo_code, plan_type)

    return await billing_service.calculate_price(
        db, plan, data.billing_cycle, promotion=promotion
    )


@router.post("/upgrade", response_model=SubscriptionResponse)
async def upgrade(
    data: UpgradeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Fazer upgrade do plano (pessoal -> familiar, etc.)."""
    sub = await billing_service.upgrade_subscription(
        db,
        user_id=user.id,
        target_plan_id=data.target_plan_id,
        extra_members=data.extra_members,
    )
    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


@router.post("/change-plan", response_model=SubscriptionResponse)
async def change_plan(
    data: ChangePlanRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Mudar de plano e/ou periodicidade. Detecta direccao automaticamente."""
    sub = await billing_service.change_subscription(
        db,
        user_id=user.id,
        target_plan_id=data.target_plan_id,
        target_billing_cycle=data.target_billing_cycle,
        extra_members=data.extra_members,
    )
    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


@router.post("/preview-change")
async def preview_change(
    data: ChangePlanRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Pre-visualizar mudanca de plano com detalhes de prorateio."""
    return await billing_service.preview_plan_change(
        db,
        user_id=user.id,
        target_plan_id=data.target_plan_id,
        target_billing_cycle=data.target_billing_cycle,
        extra_members=data.extra_members,
    )


@router.post("/cancel-pending-change", response_model=SubscriptionResponse)
async def cancel_pending(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Cancelar mudanca de plano agendada."""
    sub = await billing_service.cancel_pending_change(db, user.id)
    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Cancelar subscrição (mantém acesso até ao fim do período)."""
    sub = await billing_service.cancel_subscription(db, user.id)
    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


@router.post("/reactivate", response_model=SubscriptionResponse)
async def reactivate(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Reactivar subscrição cancelada (se ainda dentro do período)."""
    sub = await billing_service.reactivate_subscription(db, user.id)
    features = await billing_service.get_user_features(db, user.id)
    return await _sub_to_response(db, sub, features)


# ---------------------------------------------------------------------------
# Promotions
# ---------------------------------------------------------------------------

class ValidatePromoBody(BaseModel):
    code: str


class ValidatePromoResponse(BaseModel):
    name: str
    type: str
    value: int
    free_days: int
    description: str


def _describe_promo(promo: object) -> str:
    """Human-readable description of a promotion."""
    promo_type = promo.type.value if hasattr(promo.type, "value") else str(promo.type)
    if promo_type == "free_days":
        return f"{promo.free_days} dias grátis"
    elif promo_type == "percentage":
        return f"{promo.value}% de desconto"
    elif promo_type == "fixed_amount":
        return f"Desconto de {promo.value // 100} Kz"
    return ""


@router.post("/validate-promo", response_model=ValidatePromoResponse)
async def validate_promo(
    data: ValidatePromoBody,
    db: AsyncSession = Depends(get_db),
) -> ValidatePromoResponse:
    """Validar código promocional sem autenticação. Para o fluxo de registo."""
    promo = await billing_service.validate_promotion(db, data.code, None)
    if not promo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Código promocional inválido ou expirado",
        )
    promo_type = promo.type.value if hasattr(promo.type, "value") else str(promo.type)
    return ValidatePromoResponse(
        name=promo.name,
        type=promo_type,
        value=promo.value,
        free_days=promo.free_days,
        description=_describe_promo(promo),
    )


class ApplyPromoBody(BaseModel):
    code: str


@router.post("/apply-promo", response_model=PriceBreakdown)
async def apply_promo(
    data: ApplyPromoBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PriceBreakdown:
    """Aplicar código promocional e ver o desconto resultante.

    Valida o código contra a subscrição activa do utilizador.
    Se não tiver subscrição activa, valida contra o plano pessoal por defeito.
    """
    sub = await billing_service.get_active_subscription(db, user.id)

    if sub and sub.plan_id:
        plan = await billing_service._get_plan_or_404(db, sub.plan_id)
        billing_cycle = sub.billing_cycle
    else:
        # Preview against cheapest plan
        stmt = (
            select(Plan)
            .where(Plan.is_active.is_(True))
            .order_by(Plan.base_price_monthly.asc())
            .limit(1)
        )
        result = await db.execute(stmt)
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum plano disponível.",
            )
        from app.models.enums import BillingCycle
        billing_cycle = BillingCycle.MONTHLY

    plan_type = plan.type.value if hasattr(plan.type, "value") else str(plan.type)
    promotion = await billing_service.validate_promotion(db, data.code, plan_type)
    if not promotion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código promocional inválido ou expirado.",
        )

    return await billing_service.calculate_price(
        db, plan, billing_cycle, promotion=promotion
    )


# ---------------------------------------------------------------------------
# Add-ons
# ---------------------------------------------------------------------------

@router.get("/addons", response_model=list[ModuleAddonResponse])
async def list_addons(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ModuleAddonResponse]:
    """Listar extras disponíveis."""
    addons = await billing_service.list_active_addons(db)
    return [
        ModuleAddonResponse(
            id=str(a.id),
            name=a.name,
            module=a.module,
            description=a.description,
            price_monthly=a.price_monthly,
            price_annual=a.price_annual,
            features_override=a.features_override or {},
            is_active=a.is_active,
        )
        for a in addons
    ]


@router.post("/addons/{addon_id}/add")
async def add_addon(
    addon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Adicionar extra à subscrição activa."""
    sub_addon = await billing_service.add_addon_to_subscription(
        db, user.id, str(addon_id)
    )
    return {
        "message": "Extra adicionado com sucesso.",
        "addon_id": str(sub_addon.module_addon_id),
        "price": sub_addon.price,
    }


@router.delete("/addons/{addon_id}/remove")
async def remove_addon(
    addon_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remover extra da subscrição activa."""
    await billing_service.remove_addon_from_subscription(
        db, user.id, str(addon_id)
    )
    return {"message": "Extra removido com sucesso."}


# ---------------------------------------------------------------------------
# Payment gateways
# ---------------------------------------------------------------------------

@router.get("/gateways")
async def list_gateways() -> list[dict]:
    """Listar gateways de pagamento disponíveis."""
    return await payment_service.get_available_gateways()


# ---------------------------------------------------------------------------
# Payment methods
# ---------------------------------------------------------------------------

class AddPaymentMethodRequest(BaseModel):
    gateway: PaymentGatewayType
    payment_method_token: str
    set_as_default: bool = True


class PaymentMethodResponse(BaseModel):
    id: str
    gateway: str
    method_type: str
    label: str
    is_default: bool
    metadata: dict
    created_at: str


@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PaymentMethodResponse]:
    """Listar métodos de pagamento do utilizador."""
    methods = await payment_service.list_payment_methods(db, user.id)
    return [
        PaymentMethodResponse(
            id=str(pm.id),
            gateway=pm.gateway.value if hasattr(pm.gateway, "value") else str(pm.gateway),
            method_type=pm.method_type.value if hasattr(pm.method_type, "value") else str(pm.method_type),
            label=pm.label,
            is_default=pm.is_default,
            metadata=pm.metadata_ or {},
            created_at=pm.created_at.isoformat(),
        )
        for pm in methods
    ]


@router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=201)
async def add_payment_method(
    data: AddPaymentMethodRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaymentMethodResponse:
    """Adicionar método de pagamento."""
    pm = await payment_service.add_payment_method(
        db,
        user_id=user.id,
        gateway=data.gateway,
        payment_method_token=data.payment_method_token,
        set_as_default=data.set_as_default,
    )
    return PaymentMethodResponse(
        id=str(pm.id),
        gateway=pm.gateway.value if hasattr(pm.gateway, "value") else str(pm.gateway),
        method_type=pm.method_type.value if hasattr(pm.method_type, "value") else str(pm.method_type),
        label=pm.label,
        is_default=pm.is_default,
        metadata=pm.metadata_ or {},
        created_at=pm.created_at.isoformat(),
    )


@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(
    payment_method_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Remover método de pagamento."""
    await payment_service.remove_payment_method(db, user.id, payment_method_id)
    return {"message": "Método de pagamento removido."}


@router.put("/payment-methods/{payment_method_id}/default", response_model=PaymentMethodResponse)
async def set_default_method(
    payment_method_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaymentMethodResponse:
    """Definir método de pagamento como predefinido."""
    pm = await payment_service.set_default_payment_method(db, user.id, payment_method_id)
    return PaymentMethodResponse(
        id=str(pm.id),
        gateway=pm.gateway.value if hasattr(pm.gateway, "value") else str(pm.gateway),
        method_type=pm.method_type.value if hasattr(pm.method_type, "value") else str(pm.method_type),
        label=pm.label,
        is_default=pm.is_default,
        metadata=pm.metadata_ or {},
        created_at=pm.created_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# Stripe setup intent (for adding cards via embedded Elements)
# ---------------------------------------------------------------------------

@router.post("/stripe/setup-intent")
async def create_setup_intent(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Criar SetupIntent Stripe para adicionar cartão (embedded Elements)."""
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe não configurado",
        )
    return await payment_service.create_stripe_setup_intent(db, user.id)


# ---------------------------------------------------------------------------
# Payment history
# ---------------------------------------------------------------------------

class PaymentResponse(BaseModel):
    id: str
    amount: int
    currency: str
    status: str
    gateway: str
    payment_type: str
    description: str | None
    paid_at: str | None
    created_at: str


@router.get("/payments", response_model=list[PaymentResponse])
async def list_payments(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PaymentResponse]:
    """Listar histórico de pagamentos."""
    payments = await payment_service.list_payments(db, user.id, limit=limit, offset=offset)
    return [
        PaymentResponse(
            id=str(p.id),
            amount=p.amount,
            currency=p.currency.value if hasattr(p.currency, "value") else str(p.currency),
            status=p.status.value if hasattr(p.status, "value") else str(p.status),
            gateway=p.gateway.value if hasattr(p.gateway, "value") else str(p.gateway),
            payment_type=p.payment_type.value if hasattr(p.payment_type, "value") else str(p.payment_type),
            description=p.description,
            paid_at=p.paid_at.isoformat() if p.paid_at else None,
            created_at=p.created_at.isoformat(),
        )
        for p in payments
    ]


# ---------------------------------------------------------------------------
# Invoices & Receipts (user-facing)
# ---------------------------------------------------------------------------

class InvoiceLineResponse(BaseModel):
    description: str
    quantity: int
    unit_price: int
    discount_amount: int
    vat_rate: str
    vat_amount: int
    line_total: int


class InvoiceResponse(BaseModel):
    id: str
    document_type: str
    document_number: str
    customer_name: str
    subtotal: int
    discount_total: int
    discount_reason: str | None
    vat_total: int
    total: int
    currency: str
    status: str
    issue_date: str
    atcud: str
    lines: list[InvoiceLineResponse]


class ReceiptResponse(BaseModel):
    id: str
    document_number: str
    invoice_document_number: str | None
    amount: int
    currency: str
    status: str
    issue_date: str
    payment_method_description: str | None
    atcud: str


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[InvoiceResponse]:
    """Listar facturas do utilizador."""
    from app.services.invoicing import list_user_invoices
    invoices = await list_user_invoices(db, user.id, limit=limit, offset=offset)
    return [
        InvoiceResponse(
            id=str(inv.id),
            document_type=inv.document_type.value,
            document_number=inv.document_number,
            customer_name=inv.customer_name,
            subtotal=inv.subtotal,
            discount_total=inv.discount_total,
            discount_reason=inv.discount_reason,
            vat_total=inv.vat_total,
            total=inv.total,
            currency=inv.currency.value if hasattr(inv.currency, "value") else str(inv.currency),
            status=inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            issue_date=inv.issue_date.isoformat(),
            atcud=inv.atcud,
            lines=[
                InvoiceLineResponse(
                    description=l.description,
                    quantity=l.quantity,
                    unit_price=l.unit_price,
                    discount_amount=l.discount_amount,
                    vat_rate=l.vat_rate,
                    vat_amount=l.vat_amount,
                    line_total=l.line_total,
                )
                for l in (inv.lines or [])
            ],
        )
        for inv in invoices
    ]


async def _get_user_from_token_or_header(
    request: Request,
    db: AsyncSession,
    token: str | None = None,
) -> User:
    """Authenticate via Authorization header OR ?token= query param (for PDF downloads in new tab)."""
    if token:
        from app.services.auth import decode_access_token
        user_id = decode_access_token(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalido")
        user = await db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Utilizador nao encontrado")
        return user
    # Fallback to standard auth header
    return await get_current_user(request=request, db=db)


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: str | None = None,
) -> "Response":
    """Descarregar PDF de factura. Aceita auth via header ou ?token= query param."""
    from fastapi.responses import Response as FastAPIResponse
    user = await _get_user_from_token_or_header(request, db, token)

    from app.models.invoice import Invoice as InvoiceModel
    inv = await db.get(InvoiceModel, invoice_id)
    if not inv or inv.user_id != user.id:
        raise HTTPException(status_code=404, detail="Factura nao encontrada")

    from app.services.pdf_generator import generate_invoice_pdf
    pdf_bytes = generate_invoice_pdf(inv, inv.lines or [])
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{inv.document_number.replace("/", "-")}.pdf"'},
    )


@router.get("/receipts", response_model=list[ReceiptResponse])
async def list_receipts(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ReceiptResponse]:
    """Listar recibos do utilizador."""
    from app.services.invoicing import list_user_receipts
    receipts = await list_user_receipts(db, user.id, limit=limit, offset=offset)

    result = []
    for r in receipts:
        inv_number = None
        if r.invoice_id:
            from app.models.invoice import Invoice as InvModel
            inv = await db.get(InvModel, r.invoice_id)
            if inv:
                inv_number = inv.document_number
        result.append(ReceiptResponse(
            id=str(r.id),
            document_number=r.document_number,
            invoice_document_number=inv_number,
            amount=r.amount,
            currency=r.currency.value if hasattr(r.currency, "value") else str(r.currency),
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            issue_date=r.issue_date.isoformat(),
            payment_method_description=r.payment_method_description,
            atcud=r.atcud,
        ))
    return result


@router.get("/receipts/{receipt_id}/pdf")
async def download_receipt_pdf(
    receipt_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: str | None = None,
) -> "Response":
    """Descarregar PDF de recibo. Aceita auth via header ou ?token= query param."""
    from fastapi.responses import Response as FastAPIResponse
    user = await _get_user_from_token_or_header(request, db, token)

    from app.models.invoice import Receipt as ReceiptModel, Invoice as InvModel
    receipt = await db.get(ReceiptModel, receipt_id)
    if not receipt or receipt.user_id != user.id:
        raise HTTPException(status_code=404, detail="Recibo nao encontrado")

    inv = await db.get(InvModel, receipt.invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Factura associada nao encontrada")

    from app.services.pdf_generator import generate_receipt_pdf
    pdf_bytes = generate_receipt_pdf(receipt, inv)
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{receipt.document_number.replace("/", "-")}.pdf"'},
    )


# ---------------------------------------------------------------------------
# Auto-billing (cron job)
# ---------------------------------------------------------------------------

@router.post("/auto-billing")
async def run_auto_billing(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Executar cobrancas automaticas de subscricoes (cron job).

    Requer X-Service-Token no header.
    """
    service_token = request.headers.get("X-Service-Token") or ""
    if not settings.service_token or service_token != settings.service_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token de servico invalido")

    from app.services.auto_billing import process_renewals

    stats = await process_renewals(db)
    return {"message": "Auto-billing concluido", "stats": stats}


# ---------------------------------------------------------------------------
# Stripe webhook (multi-gateway aware)
# ---------------------------------------------------------------------------

@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Processar eventos do Stripe webhook.

    Eventos processados:
    - payment_intent.succeeded: registar pagamento concluído
    - payment_intent.payment_failed: registar falha
    - setup_intent.succeeded: adicionar método de pagamento
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.stripe_webhook_secret:
        logger.info("Webhook Stripe recebido sem secret (modo dev)")
        return {"received": True}

    try:
        import stripe

        stripe.api_key = settings.stripe_secret_key
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Payload inválido") from None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro webhook: {e!s}") from e

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Webhook Stripe: %s", event_type)

    if event_type == "payment_intent.succeeded":
        await _handle_payment_succeeded(db, data)
    elif event_type == "payment_intent.payment_failed":
        await _handle_payment_failed(db, data)
    elif event_type == "setup_intent.succeeded":
        await _handle_setup_succeeded(db, data)
    else:
        logger.debug("Webhook Stripe ignorado: %s", event_type)

    return {"received": True}


async def _handle_payment_succeeded(db: AsyncSession, data: dict) -> None:
    """Registar pagamento concluído via Stripe."""
    metadata = data.get("metadata", {})
    user_id = metadata.get("user_id")
    subscription_id = metadata.get("subscription_id")
    payment_id = metadata.get("payment_id")

    if payment_id:
        # Update existing payment record
        from app.models.payment import Payment

        payment = await db.get(Payment, uuid.UUID(payment_id))
        if payment and payment.status != PaymentStatus.COMPLETED:
            payment.status = PaymentStatus.COMPLETED
            payment.gateway_payment_id = data.get("id")
            payment.paid_at = datetime.now(UTC)
            payment.gateway_response = {"stripe_event": "payment_intent.succeeded"}
            await db.commit()
            logger.info("Pagamento %s actualizado para COMPLETED", payment_id)
    elif user_id:
        # Record new payment from webhook
        from app.models.enums import CurrencyCode, PaymentType

        await payment_service.record_payment(
            db,
            user_id=uuid.UUID(user_id),
            amount=data.get("amount", 0),
            currency=CurrencyCode.AOA,
            gateway=PaymentGatewayType.STRIPE,
            payment_type=PaymentType.SUBSCRIPTION,
            gateway_payment_id=data.get("id"),
            gateway_response={"stripe_event": "payment_intent.succeeded"},
            subscription_id=uuid.UUID(subscription_id) if subscription_id else None,
        )


async def _handle_payment_failed(db: AsyncSession, data: dict) -> None:
    """Registar falha de pagamento e marcar subscrição como PAST_DUE."""
    metadata = data.get("metadata", {})
    payment_id = metadata.get("payment_id")
    subscription_id = metadata.get("subscription_id")

    if payment_id:
        from app.models.payment import Payment

        payment = await db.get(Payment, uuid.UUID(payment_id))
        if payment:
            payment.status = PaymentStatus.FAILED
            payment.failure_reason = data.get("last_payment_error", {}).get("message", "Pagamento recusado")
            payment.gateway_response = {"stripe_event": "payment_intent.payment_failed"}

    if subscription_id:
        sub = await db.get(UserSubscription, uuid.UUID(subscription_id))
        if sub and sub.status == SubscriptionStatus.ACTIVE:
            sub.status = SubscriptionStatus.PAST_DUE
            logger.warning("Subscrição %s marcada como PAST_DUE", subscription_id)

    await db.commit()


async def _handle_setup_succeeded(db: AsyncSession, data: dict) -> None:
    """Adicionar método de pagamento após SetupIntent concluído."""
    metadata = data.get("metadata", {})
    user_id = metadata.get("user_id")
    pm_id = data.get("payment_method")

    if user_id and pm_id:
        await payment_service.add_payment_method(
            db,
            user_id=uuid.UUID(user_id),
            gateway=PaymentGatewayType.STRIPE,
            payment_method_token=pm_id,
            set_as_default=True,
        )
        logger.info("Método de pagamento Stripe adicionado via webhook: user=%s", user_id)
