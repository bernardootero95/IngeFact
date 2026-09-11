import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.application.cliente_service import ClienteService
from src.core.alegra_client import AlegraApiError, AlegraClient
from src.core.alegra_errors import map_alegra_error
from src.core.dependencies import CurrentExternalClient, get_current_api_key
from src.domain.cliente import (
    ActualizarClienteRequest,
    ClienteResponse,
    ConsultarAdquirienteResponse,
    CrearClienteRequest,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/external/v1/clientes", tags=["external"])


@router.get("", response_model=list[ClienteResponse])
def listar_clientes(
    search: str | None = None,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    clientes = ClienteService(db).listar(client.empresa_id, search=search)
    return [ClienteResponse.from_model(c) for c in clientes]


@router.get("/consultar-dian", response_model=ConsultarAdquirienteResponse)
def consultar_adquiriente(
    tipo_identificacion: str,
    numero_identificacion: str,
    _client: CurrentExternalClient = Depends(get_current_api_key),
):
    try:
        data = AlegraClient().get_acquirer_info(tipo_identificacion, numero_identificacion)
    except AlegraApiError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, map_alegra_error(exc.status_code, exc.body))
    return ConsultarAdquirienteResponse(name=data.get("receiverName"), email=data.get("receiverEmail"))


@router.get("/{cliente_id}", response_model=ClienteResponse)
def obtener_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    cliente = ClienteService(db).obtener(client.empresa_id, cliente_id)
    return ClienteResponse.from_model(cliente)


@router.post("", response_model=ClienteResponse, status_code=201)
def crear_cliente(
    body: CrearClienteRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    cliente = ClienteService(db).crear(client.empresa_id, body)
    return ClienteResponse.from_model(cliente)


@router.patch("/{cliente_id}", response_model=ClienteResponse)
def actualizar_cliente(
    cliente_id: uuid.UUID,
    body: ActualizarClienteRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    cliente = ClienteService(db).actualizar(client.empresa_id, cliente_id, body)
    return ClienteResponse.from_model(cliente)


@router.delete("/{cliente_id}", status_code=204)
def eliminar_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    ClienteService(db).eliminar(client.empresa_id, cliente_id)
