from sqlalchemy.orm import Session

from src.core.config import get_settings
from src.domain.configuracion import ConfiguracionNegocioRequest
from src.infrastructure.db.models import ConfiguracionNegocio


class ConfiguracionService:
    """Parametros financieros del negocio (TRM, servidor, comision). Sin fila
    guardada se usan los valores por defecto de Settings (variables de
    entorno), asi el dashboard funciona antes de que el admin los edite."""

    def __init__(self, db: Session):
        self.db = db

    def obtener(self) -> dict:
        fila = self.db.get(ConfiguracionNegocio, 1)
        if fila is not None:
            return {
                "costo_servidor_usd": float(fila.costo_servidor_usd),
                "trm_usd_cop": float(fila.trm_usd_cop),
                "comision_paquetes_pct": float(fila.comision_paquetes_pct),
            }
        settings = get_settings()
        return {
            "costo_servidor_usd": settings.costo_servidor_usd,
            "trm_usd_cop": settings.trm_usd_cop,
            "comision_paquetes_pct": settings.comision_paquetes_pct,
        }

    def guardar(self, data: ConfiguracionNegocioRequest) -> dict:
        fila = self.db.get(ConfiguracionNegocio, 1)
        if fila is None:
            fila = ConfiguracionNegocio(id=1)
        fila.costo_servidor_usd = data.costo_servidor_usd
        fila.trm_usd_cop = data.trm_usd_cop
        fila.comision_paquetes_pct = data.comision_paquetes_pct
        self.db.add(fila)
        self.db.commit()
        return self.obtener()
