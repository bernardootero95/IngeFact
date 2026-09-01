import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class Producto(Base):
    """Catalogo propio de productos/servicios de un tenant. Alegra no expone
    un catalogo de items en su API de e-provider -- cada linea de factura se
    envia inline; esta tabla existe solo para precargar esas lineas (Sprint 8)."""

    __tablename__ = "productos"
    __table_args__ = (
        CheckConstraint("tipo IN ('bien', 'servicio')", name="ck_productos_tipo"),
        CheckConstraint("precio >= 0", name="ck_productos_precio_positivo"),
        CheckConstraint(
            "tarifa_impuesto >= 0 AND tarifa_impuesto <= 100", name="ck_productos_tarifa_impuesto_rango"
        ),
        # Codigo unico por tenant solo entre productos activos -- mismo patron
        # que "ix_clientes_empresa_documento_activo" (Sprint 6): un producto
        # eliminado libera su codigo para reusarlo.
        Index(
            "ix_productos_empresa_codigo_activo",
            "empresa_id",
            "codigo",
            unique=True,
            postgresql_where=text("eliminado IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False, default="bien")
    codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    precio: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    tributo: Mapped[str | None] = mapped_column(String(50))
    tarifa_impuesto: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activo")

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
