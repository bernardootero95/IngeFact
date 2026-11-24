import uuid
from datetime import date

from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from src.application.cliente_service import ClienteService
from src.application.producto_service import ProductoService
from src.application.resolucion_dian_service import ResolucionDianService
from src.domain.tenant_dashboard import (
    ESTADO_FACTURA_EMITIDA,
    FacturacionMes,
    TenantDashboardResponse,
    rango_mes,
    rango_mes_anterior,
)
from src.infrastructure.db.models import Factura


class TenantDashboardService:
    """KPIs del panel de una empresa. Lo que ya viene en /tenant/empresa
    (suscripcion, conexion a Alegra) no se repite aqui."""

    def __init__(self, db: Session):
        self.db = db

    def obtener(self, empresa_id: uuid.UUID, hoy: date) -> TenantDashboardResponse:
        facturacion_mes = self._facturacion_entre(empresa_id, *rango_mes(hoy))
        return TenantDashboardResponse(
            facturas_emitidas_mes=facturacion_mes.cantidad,
            clientes_registrados=ClienteService(self.db).contar(empresa_id),
            resolucion_configurada=ResolucionDianService(self.db).obtener(empresa_id) is not None,
            facturacion_mes=facturacion_mes,
            facturacion_mes_anterior=self._facturacion_entre(empresa_id, *rango_mes_anterior(hoy)),
            productos_registrados=ProductoService(self.db).contar(empresa_id),
            tiene_facturas=self._tiene_facturas(empresa_id),
        )

    @staticmethod
    def _emitidas(empresa_id: uuid.UUID):
        return (
            Factura.empresa_id == empresa_id,
            Factura.estado == ESTADO_FACTURA_EMITIDA,
            Factura.eliminado.is_(None),
        )

    def _facturacion_entre(self, empresa_id: uuid.UUID, desde: date, hasta: date) -> FacturacionMes:
        cantidad, total = self.db.execute(
            select(func.count(), func.coalesce(func.sum(Factura.total), 0)).where(
                *self._emitidas(empresa_id), Factura.fecha >= desde, Factura.fecha < hasta
            )
        ).one()
        return FacturacionMes(cantidad=cantidad, total=float(total))

    def _tiene_facturas(self, empresa_id: uuid.UUID) -> bool:
        return self.db.execute(select(exists().where(*self._emitidas(empresa_id)))).scalar_one()
