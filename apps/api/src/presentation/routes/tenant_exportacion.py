from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.application.empresa_admin_service import EmpresaAdminService
from src.application.exportacion_service import ExportacionService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.core.tiempo import hoy_colombia
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/exportacion", tags=["tenant"])

MEDIA_TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/excel")
def descargar_excel(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Toda la informacion de la empresa en un .xlsx. Disponible siempre,
    tambien con el plan vencido (es lectura)."""
    empresa = EmpresaAdminService(db).obtener(tenant.empresa_id)
    contenido = ExportacionService(db).libro_excel(tenant.empresa_id)
    nombre = f"ingefact-{empresa.numero_identificacion}-{hoy_colombia():%Y-%m-%d}.xlsx"
    return Response(
        content=contenido,
        media_type=MEDIA_TYPE_XLSX,
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
