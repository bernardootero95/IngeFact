import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.nota_credito_service import NotaCreditoService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.nota_credito import (
    ActualizarNotaCreditoRequest,
    CrearNotaCreditoRequest,
    DisponibilidadLineaResponse,
    NotaCreditoListItemResponse,
    NotaCreditoResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant", tags=["tenant"])


@router.get("/facturas/{factura_id}/lineas-disponibles", response_model=list[DisponibilidadLineaResponse])
def obtener_lineas_disponibles(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Cuanto de cada linea de la factura todavia se puede acreditar --
    usado por el formulario de Nueva Nota Credito para acotar la cantidad."""
    disponibilidad = NotaCreditoService(db).disponibilidad_lineas_por_factura(tenant.empresa_id, factura_id)
    return [
        DisponibilidadLineaResponse(factura_linea_id=str(linea_id), cantidad_disponible=cantidad)
        for linea_id, cantidad in disponibilidad.items()
    ]


@router.post("/facturas/{factura_id}/notas-credito", response_model=NotaCreditoResponse, status_code=201)
def crear_borrador(
    factura_id: uuid.UUID,
    body: CrearNotaCreditoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaCreditoService(db).crear_borrador(tenant.empresa_id, factura_id, body)
    return NotaCreditoResponse.from_model(nota)


@router.post("/facturas/{factura_id}/anular", response_model=NotaCreditoResponse)
def anular_factura(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaCreditoService(db).anular_factura(tenant.empresa_id, factura_id)
    return NotaCreditoResponse.from_model(nota)


@router.get("/notas-credito", response_model=list[NotaCreditoListItemResponse])
def listar_notas_credito(
    estado: str | None = None,
    factura_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    notas = NotaCreditoService(db).listar(tenant.empresa_id, estado=estado, factura_id=factura_id)
    return [NotaCreditoListItemResponse.from_model(n) for n in notas]


@router.get("/notas-credito/{nota_id}", response_model=NotaCreditoResponse)
def obtener_nota_credito(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaCreditoService(db).obtener(tenant.empresa_id, nota_id)
    return NotaCreditoResponse.from_model(nota)


@router.put("/notas-credito/{nota_id}", response_model=NotaCreditoResponse)
def actualizar_borrador(
    nota_id: uuid.UUID,
    body: ActualizarNotaCreditoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaCreditoService(db).actualizar_borrador(tenant.empresa_id, nota_id, body)
    return NotaCreditoResponse.from_model(nota)


@router.delete("/notas-credito/{nota_id}", status_code=204)
def eliminar_borrador(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    NotaCreditoService(db).eliminar_borrador(tenant.empresa_id, nota_id)


@router.post("/notas-credito/{nota_id}/enviar", response_model=NotaCreditoResponse)
def enviar_nota_credito(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaCreditoService(db).enviar(tenant.empresa_id, nota_id)
    return NotaCreditoResponse.from_model(nota)


@router.get("/notas-credito/{nota_id}/xml")
def obtener_url_xml(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    url = NotaCreditoService(db).obtener_url_xml(tenant.empresa_id, nota_id)
    return {"url": url}
