from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.resolucion_documento_soporte_service import ResolucionDocumentoSoporteService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.resolucion_documento_soporte import (
    GuardarResolucionDocumentoSoporteRequest,
    ResolucionDocumentoSoporteResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/resolucion-documento-soporte", tags=["tenant"])


@router.get("", response_model=ResolucionDocumentoSoporteResponse)
def obtener_resolucion(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    resolucion = ResolucionDocumentoSoporteService(db).obtener_o_404(tenant.empresa_id)
    return ResolucionDocumentoSoporteResponse.from_model(resolucion)


@router.put("", response_model=ResolucionDocumentoSoporteResponse)
def guardar_resolucion(
    body: GuardarResolucionDocumentoSoporteRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    resolucion = ResolucionDocumentoSoporteService(db).guardar(tenant.empresa_id, body)
    return ResolucionDocumentoSoporteResponse.from_model(resolucion)
