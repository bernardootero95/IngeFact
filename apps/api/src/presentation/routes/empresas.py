import uuid
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.empresa_admin_service import EmpresaAdminService
from src.application.empresa_service import CreateEmpresaAlegraService
from src.application.empresa_sync_service import SincronizarEmpresasAlegraService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.empresa import (
    ActualizarEmpresaRequest,
    CambiarPlanRequest,
    CrearEmpresaRequest,
    EmpresaDetailResponse,
    EmpresaResponse,
    SuscripcionResponse,
)
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
    empresas = EmpresaAdminService(db).listar(estado=estado, fecha_desde=fecha_desde, fecha_hasta=fecha_hasta)
    return [EmpresaDetailResponse.from_empresa(e) for e in empresas]


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
    empresa = EmpresaAdminService(db).obtener(empresa_id)
    return EmpresaDetailResponse.from_empresa(empresa)


@router.patch("/{empresa_id}", response_model=EmpresaDetailResponse)
def actualizar_empresa(
    empresa_id: uuid.UUID,
    body: ActualizarEmpresaRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    empresa = EmpresaAdminService(db).actualizar(empresa_id, body)
    return EmpresaDetailResponse.from_empresa(empresa)


@router.patch("/{empresa_id}/plan", response_model=SuscripcionResponse)
def cambiar_plan_empresa(
    empresa_id: uuid.UUID,
    body: CambiarPlanRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    suscripcion = EmpresaAdminService(db).cambiar_plan(empresa_id, body)
    return SuscripcionResponse.model_validate(suscripcion)


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
