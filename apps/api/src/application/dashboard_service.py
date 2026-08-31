from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.infrastructure.db.models import Empresa


class DashboardService:
    """KPIs reales del panel admin. `documentos_emitidos_mes` se queda en 0
    hasta que exista la tabla `facturas` (Sprint 8) -- no se inventa el dato.
    `revenue_proyectado` (que pide el roadmap original) se omite: no hay un
    precio enlazado a las suscripciones en el modelo actual (ver nota de
    alcance de Suscripcion/Plan en el plan de este sprint)."""

    def __init__(self, db: Session):
        self.db = db

    def obtener_kpis(self) -> dict:
        conteos = dict(
            self.db.execute(select(Empresa.estado, func.count()).group_by(Empresa.estado)).all()
        )
        ultimas = (
            self.db.execute(select(Empresa).order_by(Empresa.creado.desc()).limit(5)).scalars().all()
        )

        return {
            "total_empresas": sum(conteos.values()),
            "empresas_activas": conteos.get("activo", 0),
            "empresas_inactivas": conteos.get("inactivo", 0),
            "empresas_con_error_alegra": conteos.get("error_alegra", 0),
            "documentos_emitidos_mes": 0,
            "ultimas_empresas": [
                {
                    "id": str(e.id),
                    "razon_social": e.razon_social,
                    "estado": e.estado,
                    "creado": e.creado,
                }
                for e in ultimas
            ],
        }
