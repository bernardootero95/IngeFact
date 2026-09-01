from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.cliente_service import ClienteService
from src.application.resolucion_dian_service import ResolucionDianService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.tenant_dashboard import TenantDashboardResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/dashboard", tags=["dashboard"])


@router.get("", response_model=TenantDashboardResponse)
def obtener_kpis(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """KPIs del panel del tenant que no vienen ya en /tenant/empresa
    (suscripcion, conexion a Alegra). `clientes_registrados` es un dato real
    desde Sprint 6 (modulo de Clientes migrado a FastAPI); `resolucion_configurada`
    es un dato real desde esta correccion (el modelo de Resolucion DIAN existe
    desde Sprint 5, pero nunca se habia conectado al dashboard).
    `facturas_emitidas_mes` se queda en 0 hasta que exista la tabla `facturas`
    (Sprint 8).
    """
    clientes_registrados = ClienteService(db).contar(tenant.empresa_id)
    resolucion_configurada = ResolucionDianService(db).obtener(tenant.empresa_id) is not None
    return TenantDashboardResponse(
        facturas_emitidas_mes=0,
        clientes_registrados=clientes_registrados,
        resolucion_configurada=resolucion_configurada,
    )
