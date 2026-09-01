import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.impuesto_empresa_service import ImpuestoEmpresaService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.impuesto_empresa import (
    ActualizarImpuestoEmpresaRequest,
    CrearImpuestoEmpresaRequest,
    ImpuestoEmpresaResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/impuestos", tags=["tenant"])


@router.get("", response_model=list[ImpuestoEmpresaResponse])
def listar_impuestos(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    impuestos = ImpuestoEmpresaService(db).listar(tenant.empresa_id)
    return [ImpuestoEmpresaResponse.from_model(i) for i in impuestos]


@router.get("/{impuesto_id}", response_model=ImpuestoEmpresaResponse)
def obtener_impuesto(
    impuesto_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    impuesto = ImpuestoEmpresaService(db).obtener(tenant.empresa_id, impuesto_id)
    return ImpuestoEmpresaResponse.from_model(impuesto)


@router.post("", response_model=ImpuestoEmpresaResponse, status_code=201)
def crear_impuesto(
    body: CrearImpuestoEmpresaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    impuesto = ImpuestoEmpresaService(db).crear(tenant.empresa_id, body)
    return ImpuestoEmpresaResponse.from_model(impuesto)


@router.patch("/{impuesto_id}", response_model=ImpuestoEmpresaResponse)
def actualizar_impuesto(
    impuesto_id: uuid.UUID,
    body: ActualizarImpuestoEmpresaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    impuesto = ImpuestoEmpresaService(db).actualizar(tenant.empresa_id, impuesto_id, body)
    return ImpuestoEmpresaResponse.from_model(impuesto)


@router.delete("/{impuesto_id}", status_code=204)
def eliminar_impuesto(
    impuesto_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    ImpuestoEmpresaService(db).eliminar(tenant.empresa_id, impuesto_id)
