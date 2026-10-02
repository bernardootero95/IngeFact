from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.empresa_admin_service import EmpresaAdminService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.core.logo_empresa import logo_data_url
from src.domain.empresa import (
    ActualizarDatosContactoRequest,
    EmpresaDetailResponse,
    LogoEmpresaResponse,
    SubirLogoRequest,
)
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/empresa", tags=["tenant"])


@router.get("", response_model=EmpresaDetailResponse)
def obtener_mi_empresa(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.obtener(tenant.empresa_id)
    return servicio.construir_respuesta_detalle(empresa)


@router.patch("", response_model=EmpresaDetailResponse)
def actualizar_mi_empresa(
    body: ActualizarDatosContactoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.actualizar_datos_contacto(tenant.empresa_id, body)
    return servicio.construir_respuesta_detalle(empresa)


@router.get("/logo", response_model=LogoEmpresaResponse)
def obtener_mi_logo(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    empresa = EmpresaAdminService(db).obtener(tenant.empresa_id)
    return LogoEmpresaResponse(data_url=logo_data_url(empresa))


@router.put("/logo", response_model=EmpresaDetailResponse)
def subir_mi_logo(
    body: SubirLogoRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.guardar_logo(tenant.empresa_id, body.imagen)
    return servicio.construir_respuesta_detalle(empresa)


@router.delete("/logo", response_model=EmpresaDetailResponse)
def eliminar_mi_logo(
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    servicio = EmpresaAdminService(db)
    empresa = servicio.eliminar_logo(tenant.empresa_id)
    return servicio.construir_respuesta_detalle(empresa)
