import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

ESTADOS_NOTA_DEBITO = ("borrador", "enviada", "aceptada", "rechazada")


class NotaDebito(Base):
    """Nota Debito contra una factura ya aceptada -- cobros adicionales
    (intereses, gastos por cobrar, etc.), no reduce nada de la factura
    original a diferencia de NotaCredito, por eso no trackea disponibilidad
    ni puede "anular". Mismo patron de payload verificado en Sprint 9
    (ver docs/alegra-investigacion.md), consecutivo interno compartido con
    NotaCredito via ConsecutivoNota (tipo='debito'), prefijo fijo "ND"."""

    __tablename__ = "notas_debito"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('borrador', 'enviada', 'aceptada', 'rechazada')", name="ck_notas_debito_estado"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    factura_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facturas.id"), nullable=False)
    cliente_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clientes.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    motivo_codigo: Mapped[str] = mapped_column(String(5), nullable=False)
    consecutivo: Mapped[int | None] = mapped_column(Integer)
    numero_completo: Mapped[str | None] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total_impuestos: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    alegra_debit_note_id: Mapped[str | None] = mapped_column(String(50))
    cude: Mapped[str | None] = mapped_column(String(200))
    qr_code_content: Mapped[str | None] = mapped_column(Text)
    firma_digital: Mapped[str | None] = mapped_column(Text)
    razon_rechazo: Mapped[str | None] = mapped_column(Text)
    notificaciones_dian: Mapped[list | None] = mapped_column(JSONB)
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    factura: Mapped["Factura"] = relationship()  # noqa: F821
    cliente: Mapped["Cliente"] = relationship()  # noqa: F821
    lineas: Mapped[list["NotaDebitoLinea"]] = relationship(
        back_populates="nota_debito", cascade="all, delete-orphan", order_by="NotaDebitoLinea.creado"
    )


class NotaDebitoLinea(Base):
    """Linea de una Nota Debito. Snapshot de la factura_linea original al
    momento de crear la nota (mismo patron que NotaCreditoLinea), pero sin
    tope de disponibilidad -- una nota debito no consume nada, solo agrega
    un cargo adicional."""

    __tablename__ = "nota_debito_lineas"
    __table_args__ = (CheckConstraint("cantidad > 0", name="ck_nota_debito_lineas_cantidad_positiva"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nota_debito_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notas_debito.id", ondelete="CASCADE"), nullable=False
    )
    factura_linea_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("factura_lineas.id"), nullable=False)
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

    nota_debito: Mapped["NotaDebito"] = relationship(back_populates="lineas")
