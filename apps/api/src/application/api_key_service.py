import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.core.security import generate_api_key
from src.infrastructure.db.models import ApiKey, Empresa


class ApiKeyService:
    """Emision/revocacion de API keys para integraciones externas -- solo la
    usa el admin (staff interno), nunca el tenant directamente. Scoping por
    empresa_id siempre explicito, mismo criterio que el resto de servicios."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self, empresa_id: uuid.UUID) -> list[ApiKey]:
        return list(
            self.db.execute(
                select(ApiKey).where(ApiKey.empresa_id == empresa_id).order_by(ApiKey.creado.desc())
            ).scalars().all()
        )

    def crear(self, empresa_id: uuid.UUID, nombre: str, admin_id: uuid.UUID) -> tuple[ApiKey, str]:
        if self.db.get(Empresa, empresa_id) is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Empresa no encontrada.")

        key_en_claro, prefijo, key_hash = generate_api_key()
        registro = ApiKey(
            empresa_id=empresa_id, nombre=nombre, prefijo=prefijo, key_hash=key_hash, creado_por=admin_id
        )
        self.db.add(registro)
        self.db.commit()
        self.db.refresh(registro)
        return registro, key_en_claro

    def revocar(self, empresa_id: uuid.UUID, api_key_id: uuid.UUID) -> None:
        registro = self.db.execute(
            select(ApiKey).where(ApiKey.id == api_key_id, ApiKey.empresa_id == empresa_id)
        ).scalar_one_or_none()
        if registro is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "API key no encontrada.")
        if registro.revocada is None:
            registro.revocada = datetime.now(timezone.utc)
            self.db.add(registro)
            self.db.commit()
