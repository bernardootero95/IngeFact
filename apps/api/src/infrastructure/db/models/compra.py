import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

ESTADOS_COMPRA = ("registrada", "anulada")


class Compra(Base):
    """Registro interno de una compra a un proveedor -- a diferencia de
    Factura, NO se envia a Alegra/DIAN (no hay documento electronico que
    emitir aqui, el Documento Soporte es un flujo manual y separado). Por
    eso no tiene los estados borrador/enviada/aceptada/rechazada de Factura:
    se registra directo como 'registrada' y solo puede pasar a 'anulada'."""

    __tablename__ = "compras"
    __table_args__ = (
        CheckConstraint("estado IN ('registrada', 'anulada')", name="ck_compras_estado"),
        # NULLs no colisionan en un indice unico de Postgres -- solo impide
        # registrar dos veces el mismo CUFE como Compra, mismo patron que
        # "ix_facturas_recibidas_empresa_cufe_activo".
        Index(
            "ix_compras_empresa_cufe_activo",
            "empresa_id",
            "cufe",
            unique=True,
            postgresql_where=text("eliminado IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    proveedor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("proveedores.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    # Numero de la factura/recibo que el proveedor le dio al tenant -- dato
    # libre (sin DIAN de por medio, no hay consecutivo propio que asignar).
    numero_documento_proveedor: Mapped[str | None] = mapped_column(String(50))
    # CUFE de la factura electronica del proveedor, si esta compra se cargo
    # con ese dato (Fase 5) -- nulo si se registro manualmente. Impide
    # registrar la misma factura dos veces (ver indice arriba) y bloquea
    # generar un Documento Soporte desde ella (ya es una factura real).
    cufe: Mapped[str | None] = mapped_column(String(200))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="registrada")
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total_impuestos: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    observaciones: Mapped[str | None] = mapped_column(Text)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    proveedor: Mapped["Proveedor"] = relationship()  # noqa: F821
    lineas: Mapped[list["CompraLinea"]] = relationship(
        back_populates="compra", cascade="all, delete-orphan", order_by="CompraLinea.creado"
    )


class CompraLinea(Base):
    """Linea de una compra. Mismo patron snapshot que FacturaLinea -- copia
    los datos del producto al momento de crear la linea, una compra ya
    registrada no debe cambiar si el producto se edita/elimina despues."""

    __tablename__ = "compra_lineas"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_compra_lineas_cantidad_positiva"),
        CheckConstraint("precio_unitario >= 0", name="ck_compra_lineas_precio_no_negativo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    compra_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("compras.id", ondelete="CASCADE"), nullable=False)
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

    compra: Mapped["Compra"] = relationship(back_populates="lineas")
