from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.empresa_admin_service import EmpresaAdminService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.empresa import ActualizarDatosContactoRequest, EmpresaDetailResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/empresa", tags=["tenant"])


@router.get("", response_model=EmpresaDetailResponse)
def obtener_mi_empresa(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.obtener(tenant.empresa_id)
    return servicio.construir_respuesta_detalle(empresa)


@router.patch("", response_model=EmpresaDetailResponse)
def actualizar_mi_empresa(
    body: ActualizarDatosContactoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.actualizar_datos_contacto(tenant.empresa_id, body)
    return servicio.construir_respuesta_detalle(empresa)
