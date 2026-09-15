import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class MovimientoInventario(Base):
    """Historial de entradas/salidas de stock de un Producto. Solo aplica a
    productos tipo 'bien' -- los servicios no manejan inventario (ver
    CompraService/FacturaService, que filtran por tipo antes de registrar
    cualquier movimiento). `origen_id` no lleva FK fisico porque apunta a
    tablas distintas segun `origen_tipo` (compras/facturas)."""

    __tablename__ = "movimientos_inventario"
    __table_args__ = (
        CheckConstraint("tipo IN ('entrada', 'salida')", name="ck_movimientos_inventario_tipo"),
        CheckConstraint(
            "origen_tipo IN ('compra', 'factura', 'ajuste_manual')", name="ck_movimientos_inventario_origen_tipo"
        ),
        CheckConstraint("cantidad > 0", name="ck_movimientos_inventario_cantidad_positiva"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("productos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    # Siempre positiva -- el signo del movimiento lo da `tipo`, no el valor.
    cantidad: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    origen_tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    origen_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    # El stock del producto DESPUES de aplicar este movimiento -- se guarda
    # para que el historial sea auditable sin recalcular todo lo anterior.
    saldo_resultante: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
