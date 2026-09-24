import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class AceptacionLegal(Base):
    """Evidencia de que un usuario tenant acepto una version de los terminos
    y condiciones y de la politica de tratamiento de datos (Ley 1581 de 2012,
    art. 9: el responsable debe conservar prueba de la autorizacion).
    Solo se inserta, nunca se actualiza: cada nueva version publicada genera
    una fila nueva, y el historial completo queda como prueba."""

    __tablename__ = "aceptaciones_legales"
    __table_args__ = (Index("ix_aceptaciones_legales_usuario_version", "usuario_id", "version"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios_empresas.id", ondelete="CASCADE"), nullable=False
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(Text)
    aceptado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
