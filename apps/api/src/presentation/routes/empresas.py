import uuid
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.empresa_admin_service import EmpresaAdminService
from src.application.empresa_service import CreateEmpresaAlegraService
from src.application.empresa_sync_service import SincronizarEmpresasAlegraService
from src.application.facturacion_plan_service import FacturacionPlanService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.empresa import (
    ActualizarEmpresaRequest,
    CambiarPlanRequest,
    CambioPlanResponse,
    CrearEmpresaRequest,
    EmpresaDetailResponse,
    EmpresaResponse,
    SuscripcionResponse,
)
from src.domain.facturacion_plan import VentaPaqueteResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/admin/empresas", tags=["empresas"])


@router.get("", response_model=list[EmpresaDetailResponse])
def listar_empresas(
    estado: str | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    servicio = EmpresaAdminService(db)
    empresas = servicio.listar(estado=estado, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    return [servicio.construir_respuesta_detalle(e) for e in empresas]


@router.post("", response_model=EmpresaResponse, status_code=201)
def crear_empresa(
    body: CrearEmpresaRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    empresa = CreateEmpresaAlegraService(db).crear(body)
    return EmpresaResponse(
        id=str(empresa.id),
        razon_social=empresa.razon_social,
        numero_identificacion=empresa.numero_identificacion,
        id_alegra=empresa.id_alegra,
        estado=empresa.estado,
    )


@router.post("/sync-alegra")
def sincronizar_empresas_alegra(
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    procesadas = SincronizarEmpresasAlegraService(db).sincronizar()
    return {"success": True, "processed": procesadas}


@router.get("/{empresa_id}", response_model=EmpresaDetailResponse)
def obtener_empresa(
    empresa_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.obtener(empresa_id)
    return servicio.construir_respuesta_detalle(empresa)


@router.patch("/{empresa_id}", response_model=EmpresaDetailResponse)
def actualizar_empresa(
    empresa_id: uuid.UUID,
    body: ActualizarEmpresaRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.actualizar(empresa_id, body)
    return servicio.construir_respuesta_detalle(empresa)


@router.patch("/{empresa_id}/plan", response_model=CambioPlanResponse)
def cambiar_plan_empresa(
    empresa_id: uuid.UUID,
    body: CambiarPlanRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    """Guarda el plan y, si es una venta, emite su factura electronica. El
    plan queda guardado aunque la factura falle (el motivo va en `factura`)."""
    suscripcion, venta = EmpresaAdminService(db).registrar_plan(empresa_id, body)
    respuesta = CambioPlanResponse.model_validate(SuscripcionResponse.model_validate(suscripcion).model_dump())
    if venta is not None:
        facturacion = FacturacionPlanService(db)
        venta = facturacion.facturar(venta)
        respuesta.factura = VentaPaqueteResponse.from_model(venta, facturacion.factura_de(venta)).factura
    return respuesta


@router.get("/{empresa_id}/ventas", response_model=list[VentaPaqueteResponse])
def listar_ventas_empresa(
    empresa_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    EmpresaAdminService(db).obtener(empresa_id)
    return [VentaPaqueteResponse.from_model(v, f) for v, f in FacturacionPlanService(db).listar_ventas(empresa_id)]


@router.post("/{empresa_id}/ventas/{venta_id}/facturar", response_model=VentaPaqueteResponse)
def facturar_venta_empresa(
    empresa_id: uuid.UUID,
    venta_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    """Reintenta la factura de una venta (no emite otra si ya salio)."""
    facturacion = FacturacionPlanService(db)
    venta = facturacion.facturar(facturacion.obtener_venta(empresa_id, venta_id))
    return VentaPaqueteResponse.from_model(venta, facturacion.factura_de(venta))


@router.post("/{empresa_id}/retry-creation", response_model=EmpresaResponse)
def reintentar_creacion(
    empresa_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    empresa = CreateEmpresaAlegraService(db).reintentar(empresa_id)
    return EmpresaResponse(
        id=str(empresa.id),
        razon_social=empresa.razon_social,
        numero_identificacion=empresa.numero_identificacion,
        id_alegra=empresa.id_alegra,
        estado=empresa.estado,
    )
