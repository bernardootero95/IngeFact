import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.application.aceptacion_legal_service import AceptacionLegalService
from src.application.auth_service import AuthService
from src.core.dependencies import CurrentTenant, bearer_scheme, decode_or_401, get_current_tenant
from src.core.legal import VERSION_TERMINOS_VIGENTE
from src.core.rate_limit import limiter
from src.domain.auth import (
    AceptarTerminosRequest,
    ChangePasswordRequest,
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
@limiter.limit("5/minute")
def login_admin(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login_admin(body.email, body.password)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login_tenant(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login_tenant(body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return AuthService(db).refresh(body.refresh_token)


@router.post("/logout", status_code=204)
def logout(body: LogoutRequest, db: Session = Depends(get_db)):
    AuthService(db).logout(body.refresh_token)


@router.post("/admin/forgot-password", status_code=204)
@limiter.limit("3/minute")
def forgot_password_admin(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).forgot_password(body.email, "admin")


@router.post("/forgot-password", status_code=204)
@limiter.limit("3/minute")
def forgot_password_tenant(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).forgot_password(body.email, "tenant")


@router.post("/reset-password", status_code=204)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).reset_password(body.token, body.new_password)


@router.post("/change-password", status_code=204)
def change_password(
    body: ChangePasswordRequest,
    tenant: CurrentTenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    AuthService(db).change_password(tenant.id, body.current_password, body.new_password)


@router.get("/me", response_model=MeResponse)
def me(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    payload = decode_or_401(credentials)
    es_admin = payload.get("user_type") == "admin"
    model = UsuarioAdmin if es_admin else UsuarioEmpresa
    user = db.get(model, uuid.UUID(payload["sub"]))
    if user is None or user.estado != "activo":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado.")
    return MeResponse(
        id=str(user.id),
        nombre=user.nombre,
        email=user.email,
        rol=payload.get("rol", "tenant"),
        empresa_id=payload.get("empresa_id"),
        # El staff interno (admin) no acepta terminos de cliente.
        terminos_pendientes=False if es_admin else AceptacionLegalService(db).tiene_pendiente(user.id),
        version_terminos=None if es_admin else VERSION_TERMINOS_VIGENTE,
    )


@router.post("/aceptar-terminos", status_code=204)
def aceptar_terminos(
    request: Request,
    body: AceptarTerminosRequest,
    tenant: CurrentTenant = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    AceptacionLegalService(db).aceptar(
        usuario_id=tenant.id,
        empresa_id=tenant.empresa_id,
        version=body.version,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
