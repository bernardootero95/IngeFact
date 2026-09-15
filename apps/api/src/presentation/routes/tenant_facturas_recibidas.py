import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.factura_recibida_service import FacturaRecibidaService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.factura_recibida import (
    CrearEventoReceptorRequest,
    CrearFacturaRecibidaRequest,
    FacturaRecibidaListItemResponse,
    FacturaRecibidaResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/facturas-recibidas", tags=["tenant"])


@router.get("", response_model=list[FacturaRecibidaListItemResponse])
def listar_facturas_recibidas(
    proveedor_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    facturas = FacturaRecibidaService(db).listar(tenant.empresa_id, proveedor_id=proveedor_id)
    return [FacturaRecibidaListItemResponse.from_model(f) for f in facturas]


@router.get("/{factura_recibida_id}", response_model=FacturaRecibidaResponse)
def obtener_factura_recibida(
    factura_recibida_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaRecibidaService(db).obtener(tenant.empresa_id, factura_recibida_id)
    return FacturaRecibidaResponse.from_model(factura)


@router.post("", response_model=FacturaRecibidaResponse, status_code=201)
def crear_factura_recibida(
    body: CrearFacturaRecibidaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaRecibidaService(db).crear(tenant.empresa_id, body)
    return FacturaRecibidaResponse.from_model(factura)


@router.delete("/{factura_recibida_id}", status_code=204)
def eliminar_factura_recibida(
    factura_recibida_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    FacturaRecibidaService(db).eliminar(tenant.empresa_id, factura_recibida_id)


@router.post("/{factura_recibida_id}/eventos", response_model=FacturaRecibidaResponse)
def registrar_evento_receptor(
    factura_recibida_id: uuid.UUID,
    body: CrearEventoReceptorRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaRecibidaService(db).registrar_evento(tenant.empresa_id, factura_recibida_id, body)
    return FacturaRecibidaResponse.from_model(factura)
