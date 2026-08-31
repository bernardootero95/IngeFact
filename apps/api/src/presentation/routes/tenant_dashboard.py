from fastapi import APIRouter, Depends

from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.tenant_dashboard import TenantDashboardResponse

router = APIRouter(prefix="/api/v1/tenant/dashboard", tags=["dashboard"])


@router.get("", response_model=TenantDashboardResponse)
def obtener_kpis(_tenant: CurrentTenant = Depends(get_current_tenant)):
    """KPIs del panel del tenant que no vienen ya en /tenant/empresa
    (suscripcion, conexion a Alegra). `facturas_emitidas_mes` se queda en 0
    hasta que exista la tabla `facturas` (Sprint 8); `resolucion_configurada`
    en False hasta que exista el modelo de Resolucion DIAN (Sprint 5) -- no
    se inventa ninguno de los dos datos.
    """
    return TenantDashboardResponse(facturas_emitidas_mes=0, resolucion_configurada=False)
