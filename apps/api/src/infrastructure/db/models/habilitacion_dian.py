import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class HabilitacionDian(Base):
    """Habilitacion de la empresa ante la DIAN por tipo de documento
    (facturacion / nomina). La fuente de verdad es Alegra
    (`company.governmentStatus`, verificado en vivo, ver
    docs/alegra-investigacion.md); `estado` es solo una cache de ese valor
    para no consultar Alegra en cada envio. Los campos del set de pruebas
    guardan el ultimo envio hecho desde IngeFact (pueden ser NULL si la
    empresa se habilito por fuera)."""

    __tablename__ = "habilitaciones_dian"
    __table_args__ = (UniqueConstraint("empresa_id", "tipo", name="uq_habilitaciones_dian_empresa_tipo"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    # "facturacion" | "nomina"
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    # "habilitada" | "en_proceso" | "no_habilitada"
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="no_habilitada")

    # TestSetId que entrega la DIAN (governmentId en Alegra).
    test_set_id: Mapped[str | None] = mapped_column(String(36))
    alegra_test_set_id: Mapped[str | None] = mapped_column(String(50))
    # Estado crudo del set en Alegra: ACCEPTED|REJECTED|FAILED|PENDING_TO_SEND|WAITING_RESPONSE
    estado_set_pruebas: Mapped[str | None] = mapped_column(String(20))
    errores_set_pruebas: Mapped[list | None] = mapped_column(JSONB)
    fecha_envio_set_pruebas: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
