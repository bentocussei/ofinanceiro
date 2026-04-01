from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    phone: str = Field(max_length=20, description="Número de telefone com código do país (+244...)")
    name: str = Field(max_length=100)
    password: str = Field(min_length=6, max_length=128)
    email: str | None = Field(None, max_length=255)
    country: str = Field("AO", max_length=2, description="Código ISO do país (AO, MZ, CV, etc.)")
    promo_code: str | None = Field(None, max_length=50, description="Código promocional opcional")


class LoginRequest(BaseModel):
    phone: str = Field(max_length=20)
    password: str = Field(min_length=1, max_length=128)


class OTPSendRequest(BaseModel):
    phone: str = Field(max_length=20)


class OTPVerifyRequest(BaseModel):
    phone: str = Field(max_length=20)
    otp: str = Field(min_length=6, max_length=6)


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str
