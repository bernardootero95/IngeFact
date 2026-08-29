from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.auth_service import AuthService
from src.domain.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)
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
