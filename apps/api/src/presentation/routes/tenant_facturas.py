import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.factura_service import FacturaService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.factura import (
    ActualizarFacturaRequest,
    CrearFacturaRequest,
    EnviarFacturaRequest,
    FacturaListItemResponse,
    FacturaResponse,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/facturas", tags=["tenant"])


@router.get("", response_model=list[FacturaListItemResponse])
def listar_facturas(
    estado: str | None = None,
    cliente_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    facturas = FacturaService(db).listar(tenant.empresa_id, estado=estado, cliente_id=cliente_id)
    return [FacturaListItemResponse.from_model(f) for f in facturas]


@router.get("/{factura_id}", response_model=FacturaResponse)
def obtener_factura(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaService(db).obtener(tenant.empresa_id, factura_id)
    return FacturaResponse.from_model(factura)


@router.post("", response_model=FacturaResponse, status_code=201)
def crear_borrador(
    body: CrearFacturaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaService(db).crear_borrador(tenant.empresa_id, body)
    return FacturaResponse.from_model(factura)


@router.put("/{factura_id}", response_model=FacturaResponse)
def actualizar_borrador(
    factura_id: uuid.UUID,
    body: ActualizarFacturaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaService(db).actualizar_borrador(tenant.empresa_id, factura_id, body)
    return FacturaResponse.from_model(factura)


@router.delete("/{factura_id}", status_code=204)
def eliminar_borrador(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    FacturaService(db).eliminar_borrador(tenant.empresa_id, factura_id)


@router.post("/{factura_id}/enviar", response_model=FacturaResponse)
def enviar_factura(
    factura_id: uuid.UUID,
    body: EnviarFacturaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaService(db).enviar(tenant.empresa_id, factura_id, body.forma_pago, body.metodo_pago)
    return FacturaResponse.from_model(factura)


@router.get("/{factura_id}/xml")
def obtener_url_xml(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Devuelve la URL S3 firmada (temporal) del XML -- se pide fresca a
    Alegra en cada llamada, nunca se persiste."""
    url = FacturaService(db).obtener_url_xml(tenant.empresa_id, factura_id)
    return {"url": url}


@router.get("/{factura_id}/firma-digital")
def obtener_firma_digital(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Extrae ds:SignatureValue del XML firmado -- se cachea en la factura
    tras el primer pedido (la firma es inmutable una vez emitido el
    documento, a diferencia de la URL del XML)."""
    firma = FacturaService(db).obtener_firma_digital(tenant.empresa_id, factura_id)
    return {"firma_digital": firma}
