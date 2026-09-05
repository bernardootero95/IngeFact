import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.nota_debito_service import NotaDebitoService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.nota_debito import (
    ActualizarNotaDebitoRequest,
    CrearNotaDebitoRequest,
    NotaDebitoListItemResponse,
    NotaDebitoResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant", tags=["tenant"])


@router.post("/facturas/{factura_id}/notas-debito", response_model=NotaDebitoResponse, status_code=201)
def crear_borrador(
    factura_id: uuid.UUID,
    body: CrearNotaDebitoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaDebitoService(db).crear_borrador(tenant.empresa_id, factura_id, body)
    return NotaDebitoResponse.from_model(nota)


@router.get("/notas-debito", response_model=list[NotaDebitoListItemResponse])
def listar_notas_debito(
    estado: str | None = None,
    factura_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    notas = NotaDebitoService(db).listar(tenant.empresa_id, estado=estado, factura_id=factura_id)
    return [NotaDebitoListItemResponse.from_model(n) for n in notas]


@router.get("/notas-debito/{nota_id}", response_model=NotaDebitoResponse)
def obtener_nota_debito(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaDebitoService(db).obtener(tenant.empresa_id, nota_id)
    return NotaDebitoResponse.from_model(nota)


@router.put("/notas-debito/{nota_id}", response_model=NotaDebitoResponse)
def actualizar_borrador(
    nota_id: uuid.UUID,
    body: ActualizarNotaDebitoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaDebitoService(db).actualizar_borrador(tenant.empresa_id, nota_id, body)
    return NotaDebitoResponse.from_model(nota)


@router.delete("/notas-debito/{nota_id}", status_code=204)
def eliminar_borrador(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    NotaDebitoService(db).eliminar_borrador(tenant.empresa_id, nota_id)


@router.post("/notas-debito/{nota_id}/enviar", response_model=NotaDebitoResponse)
def enviar_nota_debito(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nota = NotaDebitoService(db).enviar(tenant.empresa_id, nota_id)
    return NotaDebitoResponse.from_model(nota)


@router.get("/notas-debito/{nota_id}/xml")
def obtener_url_xml(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    url = NotaDebitoService(db).obtener_url_xml(tenant.empresa_id, nota_id)
    return {"url": url}


@router.get("/notas-debito/{nota_id}/firma-digital")
def obtener_firma_digital(
    nota_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    firma = NotaDebitoService(db).obtener_firma_digital(tenant.empresa_id, nota_id)
    return {"firma_digital": firma}
