import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

ESTADOS_FACTURA = ("borrador", "enviada", "aceptada", "rechazada")


class Factura(Base):
    """Factura de venta de un tenant, enviada a la DIAN via Alegra. El
    consecutivo/numero_completo solo se asignan al enviar (nunca al guardar
    un borrador) -- ver ResolucionDianService.incrementar_consecutivo."""

    __tablename__ = "facturas"
    __table_args__ = (
        CheckConstraint("estado IN ('borrador', 'enviada', 'aceptada', 'rechazada')", name="ck_facturas_estado"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    cliente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    consecutivo: Mapped[int | None] = mapped_column(Integer)
    numero_completo: Mapped[str | None] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total_impuestos: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    forma_pago: Mapped[str | None] = mapped_column(String(10))
    metodo_pago: Mapped[str | None] = mapped_column(String(10))
    alegra_invoice_id: Mapped[str | None] = mapped_column(String(50))
    cufe: Mapped[str | None] = mapped_column(String(200))
    qr_code_content: Mapped[str | None] = mapped_column(Text)
    firma_digital: Mapped[str | None] = mapped_column(Text)
    razon_rechazo: Mapped[str | None] = mapped_column(Text)
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    cliente: Mapped["Cliente"] = relationship()  # noqa: F821
    lineas: Mapped[list["FacturaLinea"]] = relationship(
        back_populates="factura", cascade="all, delete-orphan", order_by="FacturaLinea.creado"
    )


class FacturaLinea(Base):
    """Linea de una factura. Los datos del producto se copian al momento de
    crear la linea -- una factura ya enviada no debe cambiar si el producto
    se edita/elimina despues."""

    __tablename__ = "factura_lineas"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_factura_lineas_cantidad_positiva"),
        CheckConstraint("precio_unitario >= 0", name="ck_factura_lineas_precio_no_negativo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factura_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facturas.id", ondelete="CASCADE"), nullable=False)
    producto_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("productos.id"), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(50))
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    cantidad: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    tributo: Mapped[str | None] = mapped_column(String(50))
    tarifa_impuesto: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    subtotal_linea: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    impuesto_linea: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    total_linea: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    factura: Mapped["Factura"] = relationship(back_populates="lineas")
