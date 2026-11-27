import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.security import decode_access_token, hash_opaque_token
from src.infrastructure.db.models import ApiKey, Empresa, UsuarioAdmin, UsuarioEmpresa
from src.infrastructure.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


ESTADO_EMPRESA_SUSPENDIDA = "inactivo"
MENSAJE_EMPRESA_SUSPENDIDA = "Tu empresa esta suspendida. Escribenos para reactivarla."


def empresa_suspendida(db: Session, empresa_id: uuid.UUID) -> bool:
    """El staff suspende una empresa poniendola en 'inactivo' (apps/admin:
    "Inactivo / Suspendido"). Solo ese estado corta el acceso del tenant:
    'creando' y 'error_alegra' son pasos del alta y no deben bloquear el
    onboarding."""
    empresa = db.get(Empresa, empresa_id)
    return empresa is not None and empresa.estado == ESTADO_EMPRESA_SUSPENDIDA


@dataclass
class CurrentAdmin:
    id: uuid.UUID
    email: str
    rol: str


@dataclass
class CurrentTenant:
    id: uuid.UUID
    email: str
    empresa_id: uuid.UUID


@dataclass
class CurrentExternalClient:
    empresa_id: uuid.UUID
    api_key_id: uuid.UUID


def decode_or_401(credentials: HTTPAuthorizationCredentials | None) -> dict:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado: falta el token de sesion.")
    try:
        return decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesion expirada.")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalido.")


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentAdmin:
    payload = decode_or_401(credentials)
    if payload.get("user_type") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado: se requiere ser staff interno.")

    user = db.get(UsuarioAdmin, uuid.UUID(payload["sub"]))
    if user is None or user.estado != "activo":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado: no eres staff interno activo.")

    return CurrentAdmin(id=user.id, email=user.email, rol=user.rol)


def get_current_tenant(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentTenant:
    payload = decode_or_401(credentials)
    if payload.get("user_type") != "tenant":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado: se requiere ser usuario de un tenant.")

    user = db.get(UsuarioEmpresa, uuid.UUID(payload["sub"]))
    if user is None or user.estado != "activo":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado: no perteneces a ningun tenant activo.")
    if empresa_suspendida(db, user.empresa_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, MENSAJE_EMPRESA_SUSPENDIDA)

    return CurrentTenant(id=user.id, email=user.email, empresa_id=user.empresa_id)


def get_current_api_key(
    api_key: str | None = Depends(api_key_header),
    db: Session = Depends(get_db),
) -> CurrentExternalClient:
    if not api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado: falta la API key (header X-API-Key).")

    registro = db.execute(select(ApiKey).where(ApiKey.key_hash == hash_opaque_token(api_key))).scalar_one_or_none()
    if registro is None or registro.revocada is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "API key invalida o revocada.")

    empresa = db.get(Empresa, registro.empresa_id)
    if empresa is None or empresa.estado != "activo":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "La empresa asociada a esta API key no esta activa.")

    registro.ultimo_uso = datetime.now(timezone.utc)
    db.add(registro)
    db.commit()

    return CurrentExternalClient(empresa_id=registro.empresa_id, api_key_id=registro.id)
