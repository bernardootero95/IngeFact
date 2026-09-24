import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base

ESTADOS_NOMINA = ("borrador", "enviada", "aceptada", "rechazada", "anulada")

# Nomina Electronica no usa una resolucion DIAN con rango (a diferencia de
# Factura/Documento Soporte) -- confirmado en vivo (Fase 5, ver
# docs/alegra-investigacion.md): solo exige el test-set de habilitacion.
# El prefijo es fijo, mismo criterio que NotaCredito/NotaDebito (PREFIJO_NOTA_*).
PREFIJO_NOMINA = "NE"
PREFIJO_ANULACION_NOMINA = "NEA"


class Nomina(Base):
    """Comprobante de Nomina Electronica de un tenant, enviado a la DIAN via
    Alegra. El consecutivo/numero_completo solo se asignan al enviar (nunca
    al guardar un borrador), igual que Factura/Documento Soporte -- ver
    ConsecutivoNomina.

    `devengados`/`deducciones` guardan el bloque completo tal cual lo espera
    Alegra (Basico, Transporte, HEDs/HENs/HRNs, Vacaciones, Primas,
    Cesantias, Incapacidades, Licencias, Bonificaciones, etc. del lado
    Devengados; Salud, FondoPension, FondoSP, Sindicatos, Sanciones,
    Libranzas, RetencionFuente, etc. del lado Deducciones) -- son mas de 30
    bloques opcionales, varios en forma de arreglo con sub-campos propios,
    el mismo criterio ya usado en el repo para `notificaciones_dian`: datos
    estructurados variables que no se consultan por columna individual.

    `empleado_snapshot` copia el bloque Trabajador del Empleado al crear el
    borrador (mismo patron snapshot que FacturaLinea copia de Producto) --
    un cambio de sueldo/cargo futuro del empleado no debe alterar nominas ya
    emitidas."""

    __tablename__ = "nominas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('borrador', 'enviada', 'aceptada', 'rechazada', 'anulada')", name="ck_nominas_estado"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    empleado_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empleados.id"), nullable=False)

    periodo_nomina: Mapped[str] = mapped_column(String(2), nullable=False)
    fecha_liquidacion_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_liquidacion_fin: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_pago: Mapped[list] = mapped_column(JSONB, nullable=False)

    forma_pago: Mapped[str] = mapped_column(String(10), nullable=False)
    metodo_pago: Mapped[str] = mapped_column(String(10), nullable=False)
    banco: Mapped[str | None] = mapped_column(String(100))
    tipo_cuenta: Mapped[str | None] = mapped_column(String(30))
    numero_cuenta: Mapped[str | None] = mapped_column(String(50))

    devengados: Mapped[dict] = mapped_column(JSONB, nullable=False)
    deducciones: Mapped[dict] = mapped_column(JSONB, nullable=False)
    devengados_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    deducciones_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    comprobante_total: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    notas: Mapped[str | None] = mapped_column(Text)

    empleado_snapshot: Mapped[dict | None] = mapped_column(JSONB)

    consecutivo: Mapped[int | None] = mapped_column(Integer)
    numero_completo: Mapped[str | None] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    alegra_payroll_id: Mapped[str | None] = mapped_column(String(50))
    cune: Mapped[str | None] = mapped_column(String(200))
    qr_code_content: Mapped[str | None] = mapped_column(Text)
    firma_digital: Mapped[str | None] = mapped_column(Text)
    razon_rechazo: Mapped[str | None] = mapped_column(Text)
    notificaciones_dian: Mapped[list | None] = mapped_column(JSONB)
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fecha_respuesta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    consecutivo_anulacion: Mapped[int | None] = mapped_column(Integer)
    numero_completo_anulacion: Mapped[str | None] = mapped_column(String(30))
    cune_anulacion: Mapped[str | None] = mapped_column(String(200))
    # La nota de eliminacion es un documento aparte ante la DIAN y descuenta
    # su propio documento del paquete: esta fecha ubica ese descuento en el
    # periodo de la suscripcion (ver contar_documentos_usados).
    fecha_anulacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    empleado: Mapped["Empleado"] = relationship()  # noqa: F821


class ConsecutivoNomina(Base):
    """Contador interno por empresa+tipo (nomina/anulacion) -- Nomina no
    tiene resolucion/rango que registrar ante la DIAN (confirmado en vivo,
    Fase 5), mismo patron que ConsecutivoNota (Nota Credito/Debito). La
    anulacion lleva su PROPIA numeracion independiente del payroll anulado
    (confirmado contra el sandbox real: reenviar la misma anulacion con un
    numero ya usado la rechaza la DIAN con "Documento procesado
    anteriormente", regla 90)."""

    __tablename__ = "consecutivos_nomina"
    __table_args__ = (
        UniqueConstraint("empresa_id", "tipo", name="uq_consecutivos_nomina_empresa_tipo"),
        CheckConstraint("tipo IN ('nomina', 'anulacion')", name="ck_consecutivos_nomina_tipo"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    consecutivo_actual: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
