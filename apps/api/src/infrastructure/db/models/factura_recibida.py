import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

TIPOS_EVENTO_RECEPTOR = ("030", "031", "032", "033", "034")


class FacturaRecibida(Base):
    """Registro de una factura electronica que el tenant RECIBIO de un
    proveedor -- a diferencia de Factura (lo que el tenant emite), esto no
    se envia a Alegra como documento propio. Solo guarda el CUFE (dato clave
    real para registrar Eventos del Receptor, ver EventoReceptor) y datos de
    referencia minimos que el propio tenant teclea para su UI -- Alegra no
    expone ningun listado de "facturas donde soy comprador" (ver hallazgo en
    docs/alegra-investigacion.md), asi que no hay forma de precargar esto
    automaticamente."""

    __tablename__ = "facturas_recibidas"
    __table_args__ = (
        Index(
            "ix_facturas_recibidas_empresa_cufe_activo",
            "empresa_id",
            "cufe",
            unique=True,
            postgresql_where=text("eliminado IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    proveedor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("proveedores.id"), nullable=False)
    cufe: Mapped[str] = mapped_column(String(200), nullable=False)
    numero_documento_proveedor: Mapped[str | None] = mapped_column(String(50))
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    monto_total: Mapped[float | None] = mapped_column(Numeric(14, 2))
    observaciones: Mapped[str | None] = mapped_column(Text)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    proveedor: Mapped["Proveedor"] = relationship()  # noqa: F821
    eventos: Mapped[list["EventoReceptor"]] = relationship(
        back_populates="factura_recibida", cascade="all, delete-orphan", order_by="EventoReceptor.creado"
    )


class EventoReceptor(Base):
    """Un evento DIAN (acuse de recibo, reclamo, recibo del bien/servicio,
    aceptacion expresa/tacita) registrado sobre una FacturaRecibida, via
    AlegraClient.register_receiver_event (POST /events/from-cufe). Los
    campos "generador_*" (issuerParty en la API de Alegra) solo aplican a
    tipo 030/032; claim_code solo a 031 -- todos nullable porque no aplican
    a los demas tipos."""

    __tablename__ = "eventos_receptor"
    __table_args__ = (
        CheckConstraint(f"tipo IN {TIPOS_EVENTO_RECEPTOR}", name="ck_eventos_receptor_tipo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    factura_recibida_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("facturas_recibidas.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(3), nullable=False)
    numero: Mapped[str] = mapped_column(String(30), nullable=False)
    legal_status: Mapped[str | None] = mapped_column(String(30))
    cude: Mapped[str | None] = mapped_column(String(200))
    claim_code: Mapped[str | None] = mapped_column(String(2))
    notas: Mapped[str | None] = mapped_column(Text)
    generador_tipo_identificacion: Mapped[str | None] = mapped_column(String(20))
    generador_numero_identificacion: Mapped[str | None] = mapped_column(String(50))
    generador_dv: Mapped[str | None] = mapped_column(String(1))
    generador_nombres: Mapped[str | None] = mapped_column(String(150))
    generador_apellidos: Mapped[str | None] = mapped_column(String(150))
    generador_cargo: Mapped[str | None] = mapped_column(String(150))
    razon_rechazo: Mapped[str | None] = mapped_column(Text)
    notificaciones_dian: Mapped[list | None] = mapped_column(JSONB)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    factura_recibida: Mapped["FacturaRecibida"] = relationship(back_populates="eventos")
