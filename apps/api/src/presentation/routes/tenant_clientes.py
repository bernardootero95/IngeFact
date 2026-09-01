import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.application.cliente_service import ClienteService
from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.cliente import (
    ActualizarClienteRequest,
    ClienteResponse,
    ConsultarAdquirienteResponse,
    CrearClienteRequest,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/clientes", tags=["tenant"])


@router.get("", response_model=list[ClienteResponse])
def listar_clientes(
    search: str | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    clientes = ClienteService(db).listar(tenant.empresa_id, search=search)
    return [ClienteResponse.from_model(c) for c in clientes]


@router.get("/consultar-dian", response_model=ConsultarAdquirienteResponse)
def consultar_adquiriente(
    tipo_identificacion: str,
    numero_identificacion: str,
    _tenant: CurrentTenant = Depends(get_current_tenant),
):
    try:
        data = AlegraClient().get_acquirer_info(tipo_identificacion, numero_identificacion)
    except AlegraApiError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body))
    return ConsultarAdquirienteResponse(name=data.get("name"), email=data.get("email"))


@router.get("/{cliente_id}", response_model=ClienteResponse)
def obtener_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    cliente = ClienteService(db).obtener(tenant.empresa_id, cliente_id)
    return ClienteResponse.from_model(cliente)


@router.post("", response_model=ClienteResponse, status_code=201)
def crear_cliente(
    body: CrearClienteRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    cliente = ClienteService(db).crear(tenant.empresa_id, body)
    return ClienteResponse.from_model(cliente)


@router.patch("/{cliente_id}", response_model=ClienteResponse)
def actualizar_cliente(
    cliente_id: uuid.UUID,
    body: ActualizarClienteRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    cliente = ClienteService(db).actualizar(tenant.empresa_id, cliente_id, body)
    return ClienteResponse.from_model(cliente)


@router.delete("/{cliente_id}", status_code=204)
def eliminar_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    ClienteService(db).eliminar(tenant.empresa_id, cliente_id)
