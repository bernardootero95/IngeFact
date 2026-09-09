import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base


class Suscripcion(Base):
    """Cuota documental de una empresa. Solo puede haber una activa por empresa
    (blindado con un indice unico parcial en la migracion)."""

    __tablename__ = "suscripciones"
    __table_args__ = (
        Index(
            "ix_suscripciones_empresa_activa",
            "empresa_id",
            unique=True,
            postgresql_where=text("estado = 'activa'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    max_documentos: Mapped[int] = mapped_column(Integer, nullable=False)
    # Columna legacy: nunca se incrementa en el codigo (hallazgo 2026-09-09,
    # ver memoria del proyecto) -- el conteo real se calcula on-the-fly en
    # SuscripcionService.contar_documentos_usados. No se elimina para evitar
    # una migracion sin necesidad real; simplemente ya no se lee.
    documentos_usados: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activa")
    # Evita reenviar el aviso de cuota por agotarse en cada documento nuevo
    # una vez cruzado el umbral -- se resetea en cada cambiar_plan().
    alerta_cuota_enviada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    empresa: Mapped["Empresa"] = relationship(back_populates="suscripciones")  # noqa: F821
