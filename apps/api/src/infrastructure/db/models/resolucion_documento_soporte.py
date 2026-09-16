import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base


class ResolucionDocumentoSoporte(Base):
    """Resolucion de numeracion DIAN de Documento Soporte -- una autorizacion
    separada de la Resolucion DIAN de facturacion (ResolucionDian), con su
    propio rango/prefijo. Una sola por tenant, mismo patron que
    ResolucionDian. A diferencia de esa, no lleva `technical_key` (confirmado
    contra el schema real de Alegra, ver docs/alegra-investigacion.md) ni
    estado_validacion -- no hay un endpoint confirmado para precargarla/
    validarla contra Alegra todavia, se carga a mano."""

    __tablename__ = "resoluciones_documento_soporte"

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
    consecutivo_actual: Mapped[int] = mapped_column(Integer, nullable=False)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    empresa: Mapped["Empresa"] = relationship()  # noqa: F821
