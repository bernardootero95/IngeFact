import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.application.factura_service import FacturaService
from src.application.producto_service import ProductoService
from src.core.dependencies import CurrentExternalClient, get_current_api_key
from src.domain.factura import (
    ActualizarFacturaRequest,
    CrearFacturaRequest,
    EnviarFacturaRequest,
    FacturaListItemResponse,
    FacturaResponse,
    LineaFacturaRequest,
)
from src.domain.factura_externa import ActualizarFacturaExternaRequest, CrearFacturaExternaRequest
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/external/v1/facturas", tags=["external"])


def _traducir_lineas(db: Session, empresa_id: uuid.UUID, body: CrearFacturaExternaRequest) -> CrearFacturaRequest:
    """Cada linea trae el item embebido (codigo/nombre/precio/...) en vez de
    un producto_id -- se crea/actualiza el Producto correspondiente por
    codigo (obtener_o_crear) y se arma un CrearFacturaRequest 'de verdad',
    para reutilizar FacturaService sin tocarlo."""
    producto_service = ProductoService(db)
    lineas = []
    for item in body.lineas:
        producto = producto_service.obtener_o_crear(empresa_id, item)
        lineas.append(
            LineaFacturaRequest(producto_id=producto.id, cantidad=item.cantidad, precio_unitario=item.precio_unitario)
        )
    return CrearFacturaRequest(cliente_id=body.cliente_id, fecha=body.fecha, lineas=lineas)


@router.get("", response_model=list[FacturaListItemResponse])
def listar_facturas(
    estado: str | None = None,
    cliente_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    facturas = FacturaService(db).listar(client.empresa_id, estado=estado, cliente_id=cliente_id)
    return [FacturaListItemResponse.from_model(f) for f in facturas]


@router.get("/{factura_id}", response_model=FacturaResponse)
def obtener_factura(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    factura = FacturaService(db).obtener(client.empresa_id, factura_id)
    return FacturaResponse.from_model(factura)


@router.post("", response_model=FacturaResponse, status_code=201)
def crear_borrador(
    body: CrearFacturaExternaRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    payload = _traducir_lineas(db, client.empresa_id, body)
    factura = FacturaService(db).crear_borrador(client.empresa_id, payload)
    return FacturaResponse.from_model(factura)


@router.put("/{factura_id}", response_model=FacturaResponse)
def actualizar_borrador(
    factura_id: uuid.UUID,
    body: ActualizarFacturaExternaRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    payload = ActualizarFacturaRequest(**_traducir_lineas(db, client.empresa_id, body).model_dump())
    factura = FacturaService(db).actualizar_borrador(client.empresa_id, factura_id, payload)
    return FacturaResponse.from_model(factura)


@router.delete("/{factura_id}", status_code=204)
def eliminar_borrador(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    FacturaService(db).eliminar_borrador(client.empresa_id, factura_id)


@router.post("/{factura_id}/enviar", response_model=FacturaResponse)
def enviar_factura(
    factura_id: uuid.UUID,
    body: EnviarFacturaRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    factura = FacturaService(db).enviar(
        client.empresa_id, factura_id, body.forma_pago, body.metodo_pago, body.fecha_vencimiento
    )
    return FacturaResponse.from_model(factura)


@router.get("/{factura_id}/representacion.pdf")
def obtener_representacion_pdf(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    pdf_bytes = FacturaService(db).generar_pdf_representacion(client.empresa_id, factura_id)
    return Response(content=pdf_bytes, media_type="application/pdf")


@router.get("/{factura_id}/xml")
def obtener_url_xml(
    factura_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    url = FacturaService(db).obtener_url_xml(client.empresa_id, factura_id)
    return {"url": url}
