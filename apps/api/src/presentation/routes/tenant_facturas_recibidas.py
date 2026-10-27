import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.application.evento_masivo_service import EventoMasivoService
from src.application.factura_recibida_service import FacturaRecibidaService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.evento_masivo import (
    CriteriosEventoMasivoRequest,
    EmitirEventoMasivoRequest,
    ResultadoEventoMasivoResponse,
    ValidacionEventoMasivoResponse,
)
from src.domain.factura_recibida import (
    CargarLoteFacturasRecibidasRequest,
    ConsultaFacturaRecibidaResponse,
    CrearEventoReceptorRequest,
    CrearFacturaRecibidaRequest,
    FacturaRecibidaListItemResponse,
    FacturaRecibidaResponse,
    LecturaReporteDianResponse,
    LeerReporteDianRequest,
    ResultadoCargaFacturaResponse,
    XmlFacturaRecibidaResponse,
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


@router.get("/consulta", response_model=ConsultaFacturaRecibidaResponse)
def consultar_factura_recibida(
    cufe: str = Query(..., max_length=200),
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Vista previa por CUFE (datos leidos de la DIAN) antes de registrarla."""
    return FacturaRecibidaService(db).consultar(tenant.empresa_id, cufe)


@router.get("/{factura_recibida_id}/xml", response_model=XmlFacturaRecibidaResponse)
def obtener_xml_factura_recibida(
    factura_recibida_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    return FacturaRecibidaService(db).obtener_xml(tenant.empresa_id, factura_recibida_id)


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


@router.post("/reporte-dian", response_model=LecturaReporteDianResponse)
def leer_reporte_dian(
    body: LeerReporteDianRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Carga masiva, paso 1: lee el Excel de la DIAN y devuelve las facturas
    recibidas a credito que se pueden cargar."""
    return FacturaRecibidaService(db).leer_reporte_dian(tenant.empresa_id, body)


@router.post("/lote", response_model=list[ResultadoCargaFacturaResponse])
def cargar_lote_facturas_recibidas(
    body: CargarLoteFacturasRecibidasRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Carga masiva, paso 2: registra hasta MAX_CUFES_POR_LOTE facturas; el
    cliente parte la lista en lotes para mostrar el avance."""
    return FacturaRecibidaService(db).cargar_lote(tenant.empresa_id, body.cufes)


@router.post("/eventos-masivos/validar", response_model=ValidacionEventoMasivoResponse)
def validar_evento_masivo(
    body: CriteriosEventoMasivoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Evento en bloque, paso 1: cuantas facturas cumplen los criterios y
    admiten el evento, y si el cupo de documentos alcanza para todas."""
    return EventoMasivoService(db).validar(tenant.empresa_id, body)


@router.post("/eventos-masivos/emitir", response_model=list[ResultadoEventoMasivoResponse])
def emitir_evento_masivo(
    body: EmitirEventoMasivoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Evento en bloque, paso 2: envia una tanda de hasta
    MAX_FACTURAS_POR_ENVIO; el cliente parte la lista para mostrar el avance."""
    return EventoMasivoService(db).emitir(tenant.empresa_id, body)


@router.delete("/{factura_recibida_id}", status_code=204)
def eliminar_factura_recibida(
    factura_recibida_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    FacturaRecibidaService(db).eliminar(tenant.empresa_id, factura_recibida_id)


@router.post("/{factura_recibida_id}/sincronizar-eventos", response_model=FacturaRecibidaResponse)
def sincronizar_eventos_factura_recibida(
    factura_recibida_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Trae de la DIAN los eventos que la factura ya tiene (registrados por
    fuera de IngeFact) para mostrar su estado real. No consume cupo."""
    factura = FacturaRecibidaService(db).sincronizar_eventos(tenant.empresa_id, factura_recibida_id)
    return FacturaRecibidaResponse.from_model(factura)


@router.post("/{factura_recibida_id}/eventos", response_model=FacturaRecibidaResponse)
def registrar_evento_receptor(
    factura_recibida_id: uuid.UUID,
    body: CrearEventoReceptorRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    factura = FacturaRecibidaService(db).registrar_evento(tenant.empresa_id, factura_recibida_id, body)
    return FacturaRecibidaResponse.from_model(factura)
