import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.core.security import (
    create_access_token,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    refresh_token_expiry,
    reset_token_expiry,
    verify_password,
)
from src.domain.auth import TokenResponse
from src.infrastructure.db.models import PasswordResetToken, RefreshToken, UsuarioAdmin, UsuarioEmpresa

logger = logging.getLogger(__name__)

INVALID_CREDENTIALS = "Correo o contrasena incorrectos."


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def _issue_tokens(self, *, user_id: uuid.UUID, user_type: str, rol: str, empresa_id: uuid.UUID | None) -> TokenResponse:
        access = create_access_token(
            user_id=str(user_id),
            user_type=user_type,
            rol=rol,
            empresa_id=str(empresa_id) if empresa_id else None,
        )
        refresh_plain = generate_opaque_token()
        self.db.add(
            RefreshToken(
                user_id=user_id,
                user_type=user_type,
                token_hash=hash_opaque_token(refresh_plain),
                expires_at=refresh_token_expiry(),
            )
        )
        self.db.commit()
        return TokenResponse(access_token=access, refresh_token=refresh_plain)

    def login_admin(self, email: str, password: str) -> TokenResponse:
        user = self.db.query(UsuarioAdmin).filter(UsuarioAdmin.email == email).one_or_none()
        if user is None or user.estado != "activo" or not verify_password(password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)
        return self._issue_tokens(user_id=user.id, user_type="admin", rol=user.rol, empresa_id=None)

    def login_tenant(self, email: str, password: str) -> TokenResponse:
        user = self.db.query(UsuarioEmpresa).filter(UsuarioEmpresa.email == email).one_or_none()
        if user is None or user.estado != "activo" or not verify_password(password, user.password_hash):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_CREDENTIALS)
        return self._issue_tokens(user_id=user.id, user_type="tenant", rol="tenant", empresa_id=user.empresa_id)

    def refresh(self, refresh_token: str) -> TokenResponse:
        token_hash = hash_opaque_token(refresh_token)
        record = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).one_or_none()

        if record is None or record.revoked_at is not None or record.expires_at.timestamp() < _now_ts():
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token invalido o expirado.")

        record.revoked_at = _now()
        self.db.add(record)

        if record.user_type == "admin":
            user = self.db.get(UsuarioAdmin, record.user_id)
            if user is None or user.estado != "activo":
                self.db.commit()
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no activo.")
            return self._issue_tokens(user_id=user.id, user_type="admin", rol=user.rol, empresa_id=None)

        user = self.db.get(UsuarioEmpresa, record.user_id)
        if user is None or user.estado != "activo":
            self.db.commit()
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no activo.")
        return self._issue_tokens(user_id=user.id, user_type="tenant", rol="tenant", empresa_id=user.empresa_id)

    def logout(self, refresh_token: str) -> None:
        token_hash = hash_opaque_token(refresh_token)
        record = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).one_or_none()
        if record is not None and record.revoked_at is None:
            record.revoked_at = _now()
            self.db.add(record)
            self.db.commit()

    def forgot_password(self, email: str, user_type: str) -> None:
        model = UsuarioAdmin if user_type == "admin" else UsuarioEmpresa
        user = self.db.query(model).filter(model.email == email).one_or_none()
        if user is None:
            # No revelar si el correo existe o no.
            return

        reset_plain = generate_opaque_token()
        self.db.add(
            PasswordResetToken(
                user_id=user.id,
                user_type=user_type,
                token_hash=hash_opaque_token(reset_plain),
                expires_at=reset_token_expiry(),
            )
        )
        self.db.commit()

        # No hay proveedor de email configurado todavia (ver plan de Sprint 1) --
        # se deja el link en el log del servidor a modo de dev-mode, equivalente a
        # lo que capturaba Mailpit en el flujo de Supabase.
        logger.info("Password reset token for %s (%s): %s", email, user_type, reset_plain)

    def reset_password(self, token: str, new_password: str) -> None:
        token_hash = hash_opaque_token(token)
        record = self.db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).one_or_none()

        if record is None or record.used_at is not None or record.expires_at.timestamp() < _now_ts():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token de recuperacion invalido o expirado.")

        model = UsuarioAdmin if record.user_type == "admin" else UsuarioEmpresa
        user = self.db.get(model, record.user_id)
        if user is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Token de recuperacion invalido o expirado.")

        user.password_hash = hash_password(new_password)
        record.used_at = _now()
        self.db.add_all([user, record])
        self.db.commit()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_ts() -> float:
    return _now().timestamp()
