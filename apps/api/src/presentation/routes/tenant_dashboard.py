from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.cliente_service import ClienteService
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
    desde Sprint 6 (modulo de Clientes migrado a FastAPI); `facturas_emitidas_mes`
    se queda en 0 hasta que exista la tabla `facturas` (Sprint 8).
    `resolucion_configurada` sigue hardcoded en False -- quedo asi desde
    Sprint 4 (antes de que existiera el modelo de Resolucion DIAN de Sprint 5)
    y nunca se actualizo; fuera de alcance de Sprint 6, ver tarea reportada.
    """
    clientes_registrados = ClienteService(db).contar(tenant.empresa_id)
    return TenantDashboardResponse(
        facturas_emitidas_mes=0,
        clientes_registrados=clientes_registrados,
        resolucion_configurada=False,
    )
