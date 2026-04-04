"""Auth router: register, login, OTP send/verify, token refresh."""

import logging
from datetime import UTC, datetime

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    OTPSendRequest,
    OTPVerifyRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_user_by_id,
    get_user_by_phone,
    hash_password,
    verify_password,
)
from app.services import billing as billing_service
from app.services.otp import can_send_otp, generate_otp, send_otp_sms, store_otp, verify_otp

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=MessageResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    """Registar novo utilizador com telefone e password. Não retorna tokens — requer verificação OTP."""
    # Normalizar telefone: garantir que tem código do país
    phone = data.phone.strip().replace(" ", "")
    if not phone.startswith("+"):
        # Se não tem +, é número local — adicionar dial code baseado no país
        country_dials = {
            "AO": "+244", "MZ": "+258", "CV": "+238", "GW": "+245",
            "ST": "+239", "TL": "+670", "PT": "+351", "BR": "+55",
            "ZA": "+27", "NA": "+264", "CD": "+243", "CG": "+242",
        }
        dial = country_dials.get(data.country.upper(), "+244")
        phone = dial + phone

    existing = await get_user_by_phone(db, phone)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "PHONE_EXISTS", "message": "Este número já está registado"},
        )

    user = User(
        phone=phone,
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password) if data.password else None,
        country=data.country.upper(),
    )
    db.add(user)
    await db.flush()

    # Aplicar promoção: código manual tem prioridade sobre auto-registo
    if data.promo_code:
        try:
            await billing_service.apply_promo_code_on_register(db, user.id, data.promo_code)
        except Exception:
            pass
    else:
        try:
            await billing_service.apply_registration_promotion(db, user.id)
        except Exception:
            # Não bloquear o registo se a promoção falhar
            pass

    # Enviar email de boas-vindas se o utilizador forneceu email
    if data.email:
        try:
            from app.services.email import send_welcome_email
            await send_welcome_email(data.email, data.name)
        except Exception:
            pass

    # Enviar OTP para verificação do telefone
    # NÃO retornar tokens — utilizador só recebe tokens após verificar OTP
    try:
        otp = generate_otp()
        print(f"[REGISTER OTP] Gerado OTP {otp} para {phone}")
        await store_otp(phone, otp)
        print(f"[REGISTER OTP] Guardado no Redis para {phone}")
        await send_otp_sms(phone, otp)
        print(f"[REGISTER OTP] SMS enviado para {phone}")
        logger.info("OTP enviado para %s no registo", phone)
    except Exception as e:
        print(f"[REGISTER OTP] ERRO para {phone}: {e}")
        logger.warning("Falha ao enviar OTP no registo para %s: %s", phone, e)

    return MessageResponse(message="Conta criada. Verifique o código enviado por SMS.")


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Login com telefone e password."""
    # Per-phone rate limiting: 5 attempts per 5 minutes
    try:
        from app.middleware.rate_limit import check_rate_limit
        await check_rate_limit(f"login:{data.phone}", max_requests=5, window_seconds=300)
    except Exception:
        pass  # Graceful if Redis unavailable

    phone = data.phone.strip().replace(" ", "")
    user = await get_user_by_phone(db, phone)
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Credenciais inválidas"},
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Credenciais inválidas"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Conta desactivada"},
        )

    user.last_login_at = datetime.utcnow()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/otp/send", response_model=MessageResponse)
async def send_otp(data: OTPSendRequest, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    """Enviar OTP por SMS para o número de telefone."""
    if not await can_send_otp(data.phone):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "OTP_RATE_LIMIT",
                "message": "Demasiadas tentativas. Tente novamente em 10 minutos.",
            },
        )

    otp = generate_otp()
    await store_otp(data.phone, otp)
    await send_otp_sms(data.phone, otp)

    return MessageResponse(message="Código enviado por SMS")


@router.post("/otp/verify", response_model=TokenResponse)
async def otp_verify(
    data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Verificar OTP e autenticar. Cria utilizador se não existir."""
    is_valid = await verify_otp(data.phone, data.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_OTP", "message": "Código inválido ou expirado"},
        )

    user = await get_user_by_phone(db, data.phone)
    is_new_user = user is None
    if not user:
        # Auto-create user on first OTP login (onboarding will complete profile)
        user = User(phone=data.phone, name="")
        db.add(user)
        await db.flush()

        # Aplicar promoção de registo automática, se existir
        try:
            await billing_service.apply_registration_promotion(db, user.id)
        except Exception:
            pass

    user.last_login_at = datetime.utcnow()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Renovar tokens usando refresh token."""
    user_id = decode_refresh_token(data.refresh_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_REFRESH", "message": "Refresh token inválido ou expirado"},
        )

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "Utilizador não encontrado"},
        )

    access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)
