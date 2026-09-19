import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

ESTADOS_DOCUMENTO_SOPORTE = ("borrador", "enviado", "aceptado", "rechazado")


class DocumentoSoporte(Base):
    """Documento Soporte de Adquisiciones. El consecutivo solo se asigna al
    enviar (nunca al guardar un borrador), igual que Factura -- ver ResolucionDocumentoSoporteService.incrementar_consecutivo."""

    __tablename__ = "documentos_soporte"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('borrador', 'enviado', 'aceptado', 'rechazado')", name="ck_documentos_soporte_estado"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    proveedor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("proveedores.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    consecutivo: Mapped[int | None] = mapped_column(Integer)
    numero_completo: Mapped[str | None] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    subtotal: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total_impuestos: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    forma_pago: Mapped[str | None] = mapped_column(String(10))
    metodo_pago: Mapped[str | None] = mapped_column(String(10))
    alegra_support_document_id: Mapped[str | None] = mapped_column(String(50))
    cuds: Mapped[str | None] = mapped_column(String(200))
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

    proveedor: Mapped["Proveedor"] = relationship()  # noqa: F821
    lineas: Mapped[list["DocumentoSoporteLinea"]] = relationship(
        back_populates="documento_soporte", cascade="all, delete-orphan", order_by="DocumentoSoporteLinea.creado"
    )


class DocumentoSoporteLinea(Base):
    """Linea de un Documento Soporte. Mismo patron snapshot que
    FacturaLinea -- copia los datos del producto al crear la
    linea."""

    __tablename__ = "documento_soporte_lineas"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_documento_soporte_lineas_cantidad_positiva"),
        CheckConstraint("precio_unitario >= 0", name="ck_documento_soporte_lineas_precio_no_negativo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    documento_soporte_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documentos_soporte.id", ondelete="CASCADE"), nullable=False
    )
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

    documento_soporte: Mapped["DocumentoSoporte"] = relationship(back_populates="lineas")
