import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

ESTADOS_NOTA_CREDITO = ("borrador", "enviada", "aceptada", "rechazada")


class NotaCredito(Base):
    """Nota Credito contra una factura ya aceptada. A diferencia de Factura,
    no lleva resolucion/rango propio -- Alegra no exige ni valida uno para
    notas (verificado contra el sandbox real, Sprint 9). El consecutivo es
    interno (ver ConsecutivoNota), con prefijo fijo "NC"."""

    __tablename__ = "notas_credito"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('borrador', 'enviada', 'aceptada', 'rechazada')", name="ck_notas_credito_estado"
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
    alegra_credit_note_id: Mapped[str | None] = mapped_column(String(50))
    cude: Mapped[str | None] = mapped_column(String(200))
    qr_code_content: Mapped[str | None] = mapped_column(Text)
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
    lineas: Mapped[list["NotaCreditoLinea"]] = relationship(
        back_populates="nota_credito", cascade="all, delete-orphan", order_by="NotaCreditoLinea.creado"
    )


class NotaCreditoLinea(Base):
    """Linea de una Nota Credito. Los datos se copian de la factura_linea
    original al momento de crear la nota (mismo patron snapshot que
    FacturaLinea vs Producto) -- `cantidad` es la cantidad que ESTA nota
    acredita, no la cantidad original de la factura."""

    __tablename__ = "nota_credito_lineas"
    __table_args__ = (CheckConstraint("cantidad > 0", name="ck_nota_credito_lineas_cantidad_positiva"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nota_credito_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notas_credito.id", ondelete="CASCADE"), nullable=False
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

    nota_credito: Mapped["NotaCredito"] = relationship(back_populates="lineas")


class ConsecutivoNota(Base):
    """Contador interno por empresa+tipo de nota (credito/debito). A
    diferencia de ResolucionDian, no hay rango/technicalKey que registrar
    ante la DIAN -- Alegra no lo exige para notas (verificado en Sprint 9).
    El incremento atomico se hace con INSERT ... ON CONFLICT DO UPDATE
    (ver NotaCreditoService), no con un UPDATE simple, porque la fila puede
    no existir todavia para una empresa/tipo nuevos."""

    __tablename__ = "consecutivos_notas"
    __table_args__ = (
        UniqueConstraint("empresa_id", "tipo", name="uq_consecutivos_notas_empresa_tipo"),
        CheckConstraint("tipo IN ('credito', 'debito')", name="ck_consecutivos_notas_tipo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    consecutivo_actual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
