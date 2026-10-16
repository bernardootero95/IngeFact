import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class VentaPaquete(Base):
    """Historial de paquetes de documentos vendidos. Suscripcion guarda solo
    el paquete vigente (cambiar_plan lo sobrescribe), asi que cada venta se
    registra aqui con su precio para poder reportar ingresos por mes."""

    __tablename__ = "ventas_paquetes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    max_documentos: Mapped[int] = mapped_column(Integer, nullable=False)
    precio: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    # Fecha de la compra (cuando el admin asigno el paquete).
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
