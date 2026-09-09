from pydantic import BaseModel, EmailStr, field_validator


def _validar_fuerza_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("La contrasena debe tener al menos 8 caracteres.")
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("La contrasena debe incluir letras y numeros.")
    return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def email_minusculas(cls, v: str) -> str:
        return v.lower()


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    debe_cambiar_password: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def email_minusculas(cls, v: str) -> str:
        return v.lower()


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validar_password(cls, value: str) -> str:
        return _validar_fuerza_password(value)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validar_password(cls, value: str) -> str:
        return _validar_fuerza_password(value)


class MeResponse(BaseModel):
    id: str
    nombre: str
    email: str
    rol: str
    empresa_id: str | None = None
