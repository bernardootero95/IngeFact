from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.habilitacion_dian_service import HabilitacionDianService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.habilitacion_dian import EnviarSetPruebasRequest, HabilitacionResponse, TipoHabilitacion
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/habilitacion", tags=["tenant"])


@router.get("", response_model=list[HabilitacionResponse])
def listar_habilitaciones(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    habilitaciones = HabilitacionDianService(db).listar(tenant.empresa_id)
    return [HabilitacionResponse.from_model(h) for h in habilitaciones]


@router.post("/{tipo}/set-pruebas", response_model=HabilitacionResponse)
def enviar_set_pruebas(
    tipo: TipoHabilitacion,
    body: EnviarSetPruebasRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    habilitacion = HabilitacionDianService(db).enviar_set_pruebas(tenant.empresa_id, tipo, body.test_set_id)
    return HabilitacionResponse.from_model(habilitacion)
