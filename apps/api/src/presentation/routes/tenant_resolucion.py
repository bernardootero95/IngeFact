from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.resolucion_dian_service import ResolucionDianService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.resolucion_dian import GuardarResolucionDianRequest, ResolucionDianResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/resolucion", tags=["tenant"])


@router.get("", response_model=ResolucionDianResponse)
def obtener_resolucion(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    resolucion = ResolucionDianService(db).obtener_o_404(tenant.empresa_id)
    return ResolucionDianResponse.from_model(resolucion)


@router.put("", response_model=ResolucionDianResponse)
def guardar_resolucion(
    body: GuardarResolucionDianRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    resolucion = ResolucionDianService(db).guardar(tenant.empresa_id, body)
    return ResolucionDianResponse.from_model(resolucion)


@router.post("/validar", response_model=ResolucionDianResponse)
def validar_resolucion(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    resolucion = ResolucionDianService(db).validar_ante_alegra(tenant.empresa_id)
    return ResolucionDianResponse.from_model(resolucion)
