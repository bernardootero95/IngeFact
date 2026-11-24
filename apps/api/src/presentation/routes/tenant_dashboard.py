from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.tenant_dashboard_service import TenantDashboardService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.core.tiempo import hoy_colombia
from src.domain.tenant_dashboard import TenantDashboardResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/dashboard", tags=["dashboard"])


@router.get("", response_model=TenantDashboardResponse)
def obtener_kpis(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """KPIs del panel del tenant: facturacion del mes y del anterior (solo
    facturas aceptadas por la DIAN, mes calendario de Colombia), conteos de
    clientes y productos y si ya hay resolucion y facturas, para el checklist
    de configuracion."""
    return TenantDashboardService(db).obtener(tenant.empresa_id, hoy_colombia())
