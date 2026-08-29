import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.empresa_service import CreateEmpresaAlegraService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.empresa import CrearEmpresaRequest, EmpresaResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/empresas", tags=["empresas"])


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
