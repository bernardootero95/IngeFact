import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.application.auth_service import AuthService
from src.core.dependencies import bearer_scheme, decode_or_401
from src.domain.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from src.infrastructure.db.models import UsuarioAdmin, UsuarioEmpresa
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/admin/login", response_model=TokenResponse)
def login_admin(body: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login_admin(body.email, body.password)


@router.post("/login", response_model=TokenResponse)
def login_tenant(body: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login_tenant(body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh(body.refresh_token)


@router.post("/logout", status_code=204)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    AuthService(db).logout(body.refresh_token)


@router.post("/admin/forgot-password", status_code=204)
def forgot_password_admin(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).forgot_password(body.email, "admin")


@router.post("/forgot-password", status_code=204)
def forgot_password_tenant(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).forgot_password(body.email, "tenant")


@router.post("/reset-password", status_code=204)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).reset_password(body.token, body.new_password)


@router.get("/me", response_model=MeResponse)
def me(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_or_401(credentials)
    model = UsuarioAdmin if payload.get("user_type") == "admin" else UsuarioEmpresa
    user = db.get(model, uuid.UUID(payload["sub"]))
    if user is None or user.estado != "activo":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado.")
    return MeResponse(
        id=str(user.id),
        nombre=user.nombre,
        email=user.email,
        rol=payload.get("rol", "tenant"),
        empresa_id=payload.get("empresa_id"),
    )
