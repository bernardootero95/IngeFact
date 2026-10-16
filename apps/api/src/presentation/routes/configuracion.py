from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.configuracion_service import ConfiguracionService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.configuracion import ConfiguracionNegocioRequest, ConfiguracionNegocioResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/admin/configuracion", tags=["configuracion"])


@router.get("", response_model=ConfiguracionNegocioResponse)
def obtener_configuracion(
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    return ConfiguracionService(db).obtener()


@router.put("", response_model=ConfiguracionNegocioResponse)
def guardar_configuracion(
    body: ConfiguracionNegocioRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    return ConfiguracionService(db).guardar(body)
