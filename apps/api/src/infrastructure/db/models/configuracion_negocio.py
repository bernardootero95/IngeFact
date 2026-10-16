from datetime import datetime

from sqlalchemy import DateTime, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.db.session import Base


class ConfiguracionNegocio(Base):
    """Parametros financieros editables por el admin. Una sola fila (id=1);
    si no existe, el servicio usa los valores por defecto de Settings."""

    __tablename__ = "configuracion_negocio"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    costo_servidor_usd: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    trm_usd_cop: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    comision_paquetes_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
