import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.compra_service import CompraService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.compra import CompraListItemResponse, CompraResponse, CrearCompraRequest
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/compras", tags=["tenant"])


@router.get("", response_model=list[CompraListItemResponse])
def listar_compras(
    estado: str | None = None,
    proveedor_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    compras = CompraService(db).listar(tenant.empresa_id, estado=estado, proveedor_id=proveedor_id)
    return [CompraListItemResponse.from_model(c) for c in compras]


@router.get("/{compra_id}", response_model=CompraResponse)
def obtener_compra(
    compra_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    compra = CompraService(db).obtener(tenant.empresa_id, compra_id)
    return CompraResponse.from_model(compra)


@router.post("", response_model=CompraResponse, status_code=201)
def crear_compra(
    body: CrearCompraRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    compra = CompraService(db).crear(tenant.empresa_id, body)
    return CompraResponse.from_model(compra)


@router.post("/{compra_id}/anular", response_model=CompraResponse)
def anular_compra(
    compra_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    compra = CompraService(db).anular(tenant.empresa_id, compra_id)
    return CompraResponse.from_model(compra)


@router.delete("/{compra_id}", status_code=204)
def eliminar_compra(
    compra_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    CompraService(db).eliminar(tenant.empresa_id, compra_id)
