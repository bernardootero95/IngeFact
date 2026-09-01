import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class Cliente(Base):
    """Directorio de clientes (adquirientes) de un tenant -- a quien le factura."""

    __tablename__ = "clientes"
    __table_args__ = (
        # Documento unico por tenant solo entre clientes activos -- indice
        # parcial (no UniqueConstraint plano) para que eliminar un cliente
        # libere su numero de identificacion para reusarlo, mismo patron ya
        # usado en "ix_suscripciones_empresa_activa".
        Index(
            "ix_clientes_empresa_documento_activo",
            "empresa_id",
            "numero_identificacion",
            unique=True,
            postgresql_where=text("eliminado IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    tipo_identificacion: Mapped[str] = mapped_column(String(20), nullable=False)
    numero_identificacion: Mapped[str] = mapped_column(String(50), nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    correo_electronico: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(50))
    tipo_organizacion: Mapped[str | None] = mapped_column(String(50))
    regimen: Mapped[str | None] = mapped_column(String(50))
    tributo: Mapped[str | None] = mapped_column(String(50))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activo")

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
