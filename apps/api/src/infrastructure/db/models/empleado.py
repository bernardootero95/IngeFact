import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class Empleado(Base):
    """Directorio de empleados de un tenant, para Nomina Electronica (Fase
    5). Mismo patron de soft-delete que Cliente/Proveedor. Los campos vienen
    de los bloques Trabajador+Pago que exige la DIAN (ver
    docs/alegra-investigacion.md, seccion "Nomina Electronica") -- Nomina
    los copia (snapshot) al crear cada comprobante, asi que un cambio de
    sueldo futuro no altera nominas ya emitidas."""

    __tablename__ = "empleados"
    __table_args__ = (
        Index(
            "ix_empleados_empresa_documento_activo",
            "empresa_id",
            "tipo_documento",
            "numero_documento",
            unique=True,
            postgresql_where=text("eliminado IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)

    tipo_documento: Mapped[str] = mapped_column(String(2), nullable=False)
    numero_documento: Mapped[str] = mapped_column(String(60), nullable=False)
    primer_apellido: Mapped[str] = mapped_column(String(60), nullable=False)
    segundo_apellido: Mapped[str | None] = mapped_column(String(60))
    primer_nombre: Mapped[str] = mapped_column(String(60), nullable=False)
    otros_nombres: Mapped[str | None] = mapped_column(String(60))

    tipo_trabajador: Mapped[str] = mapped_column(String(2), nullable=False)
    subtipo_trabajador: Mapped[str] = mapped_column(String(2), nullable=False)
    alto_riesgo_pension: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    salario_integral: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tipo_contrato: Mapped[str] = mapped_column(String(2), nullable=False)
    sueldo: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    codigo_trabajador: Mapped[str | None] = mapped_column(String(50))

    lugar_trabajo_pais: Mapped[str] = mapped_column(String(2), nullable=False, default="CO")
    lugar_trabajo_municipio: Mapped[str] = mapped_column(String(5), nullable=False)
    lugar_trabajo_direccion: Mapped[str] = mapped_column(String(300), nullable=False)

    banco: Mapped[str | None] = mapped_column(String(100))
    tipo_cuenta: Mapped[str | None] = mapped_column(String(30))
    numero_cuenta: Mapped[str | None] = mapped_column(String(50))

    correo_electronico: Mapped[str | None] = mapped_column(String(150))
    telefono: Mapped[str | None] = mapped_column(String(50))

    fecha_ingreso: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_retiro: Mapped[date | None] = mapped_column(Date)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activo")

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
