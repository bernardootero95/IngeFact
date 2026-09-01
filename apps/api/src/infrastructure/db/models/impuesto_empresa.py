import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class ImpuestoEmpresa(Base):
    """Presets de tributo+tarifa configurados por un tenant (ej. "IVA 19%")
    para no escribir la tarifa a mano en cada producto -- ver Producto."""

    __tablename__ = "impuestos_empresa"
    __table_args__ = (
        CheckConstraint("tarifa >= 0 AND tarifa <= 100", name="ck_impuestos_empresa_tarifa_rango"),
        Index(
            "ix_impuestos_empresa_empresa_preset_activo",
            "empresa_id",
            "tributo",
            "tarifa",
            unique=True,
            postgresql_where=text("eliminado IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    tributo: Mapped[str] = mapped_column(String(50), nullable=False)
    tarifa: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activo")

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
