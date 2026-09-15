import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.application.proveedor_service import ProveedorService
from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.proveedor import (
    ActualizarProveedorRequest,
    ConsultarProveedorDianResponse,
    CrearProveedorRequest,
    ProveedorResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/proveedores", tags=["tenant"])


@router.get("", response_model=list[ProveedorResponse])
def listar_proveedores(
    search: str | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    proveedores = ProveedorService(db).listar(tenant.empresa_id, search=search)
    return [ProveedorResponse.from_model(p) for p in proveedores]


@router.get("/consultar-dian", response_model=ConsultarProveedorDianResponse)
def consultar_proveedor_dian(
    tipo_identificacion: str,
    numero_identificacion: str,
    _tenant: CurrentTenant = Depends(get_current_tenant),
):
    try:
        data = AlegraClient().get_acquirer_info(tipo_identificacion, numero_identificacion)
    except AlegraApiError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body))
    return ConsultarProveedorDianResponse(name=data.get("receiverName"), email=data.get("receiverEmail"))


@router.get("/{proveedor_id}", response_model=ProveedorResponse)
def obtener_proveedor(
    proveedor_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    proveedor = ProveedorService(db).obtener(tenant.empresa_id, proveedor_id)
    return ProveedorResponse.from_model(proveedor)


@router.post("", response_model=ProveedorResponse, status_code=201)
def crear_proveedor(
    body: CrearProveedorRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    proveedor = ProveedorService(db).crear(tenant.empresa_id, body)
    return ProveedorResponse.from_model(proveedor)


@router.patch("/{proveedor_id}", response_model=ProveedorResponse)
def actualizar_proveedor(
    proveedor_id: uuid.UUID,
    body: ActualizarProveedorRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    proveedor = ProveedorService(db).actualizar(tenant.empresa_id, proveedor_id, body)
    return ProveedorResponse.from_model(proveedor)


@router.delete("/{proveedor_id}", status_code=204)
def eliminar_proveedor(
    proveedor_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    ProveedorService(db).eliminar(tenant.empresa_id, proveedor_id)
