import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.db.session import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    razon_social: Mapped[str] = mapped_column(String(200), nullable=False)
    nombre_comercial: Mapped[str | None] = mapped_column(String(200))
    numero_identificacion: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    digito_verificacion: Mapped[str] = mapped_column(String(1), nullable=False)
    tipo_identificacion: Mapped[str] = mapped_column(String(2), nullable=False, default="31")
    direccion: Mapped[str | None] = mapped_column(String(300))
    departamento: Mapped[str | None] = mapped_column(String(2))
    municipio: Mapped[str | None] = mapped_column(String(5))
    regimen: Mapped[str | None] = mapped_column(String(20))
    telefono: Mapped[str | None] = mapped_column(String(20))
    correo_electronico: Mapped[str | None] = mapped_column(String(200))
    id_alegra: Mapped[str | None] = mapped_column(String(50))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="activo")

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    eliminado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    historial_estado_alegra: Mapped[list["CompanyStatus"]] = relationship(back_populates="empresa")
    usuarios: Mapped[list["UsuarioEmpresa"]] = relationship(back_populates="empresa")


class CompanyStatus(Base):
    """Historial de intentos de creacion/sincronizacion de la empresa contra Alegra."""

    __tablename__ = "company_status"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), nullable=False)
    detalle: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    empresa: Mapped["Empresa"] = relationship(back_populates="historial_estado_alegra")
