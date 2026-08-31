import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base


class ResolucionDian(Base):
    """Resolucion de numeracion DIAN de una empresa -- una sola por tenant
    (sin historial/multiples por ahora, ver plan de Sprint 5). El consecutivo
    interno lo calcula y controla IngeFact, no es editable por el tenant."""

    __tablename__ = "resoluciones_dian"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    numero_resolucion: Mapped[str] = mapped_column(String(50), nullable=False)
    prefijo: Mapped[str] = mapped_column(String(10), nullable=False)
    rango_minimo: Mapped[int] = mapped_column(Integer, nullable=False)
    rango_maximo: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    technical_key: Mapped[str] = mapped_column(String(100), nullable=False)
    consecutivo_actual: Mapped[int] = mapped_column(Integer, nullable=False)
    estado_validacion: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    mensaje_validacion: Mapped[str | None] = mapped_column(String(500))
    fecha_ultima_validacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    empresa: Mapped["Empresa"] = relationship()  # noqa: F821
