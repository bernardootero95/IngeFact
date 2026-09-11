import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class ApiKey(Base):
    """Credencial para que un sistema externo (sin usuario humano) hable con
    /api/v1/external/* como si fuera un tenant especifico -- alternativa al
    JWT de login. Solo se guarda el hash (sha256, mismo patron que
    refresh/reset tokens en tokens.py); el valor en claro se muestra una
    unica vez, en la respuesta de creacion."""

    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    # Primeros caracteres de la key, visibles siempre en listados para que el
    # admin identifique cual es cual sin poder reconstruir el valor completo.
    prefijo: Mapped[str] = mapped_column(String(20), nullable=False)
    key_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    creado_por: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios_admin.id"), nullable=False)
    ultimo_uso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revocada: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
