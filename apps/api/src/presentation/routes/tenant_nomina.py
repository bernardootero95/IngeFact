import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.application.nomina_service import NominaService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.envio_correo import EnviarPorCorreoRequest
from src.domain.nomina import GuardarNominaRequest, NominaResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/nomina", tags=["tenant"])


@router.get("", response_model=list[NominaResponse])
def listar_nomina(
    empleado_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nominas = NominaService(db).listar(tenant.empresa_id, empleado_id=empleado_id)
    return [NominaResponse.from_model(n) for n in nominas]


@router.get("/{nomina_id}", response_model=NominaResponse)
def obtener_nomina(
    nomina_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nomina = NominaService(db).obtener(tenant.empresa_id, nomina_id)
    return NominaResponse.from_model(nomina)


@router.post("", response_model=NominaResponse, status_code=201)
def crear_borrador(
    body: GuardarNominaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nomina = NominaService(db).crear_borrador(tenant.empresa_id, body)
    return NominaResponse.from_model(nomina)


@router.put("/{nomina_id}", response_model=NominaResponse)
def actualizar_borrador(
    nomina_id: uuid.UUID,
    body: GuardarNominaRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nomina = NominaService(db).actualizar_borrador(tenant.empresa_id, nomina_id, body)
    return NominaResponse.from_model(nomina)


@router.delete("/{nomina_id}", status_code=204)
def eliminar_borrador(
    nomina_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    NominaService(db).eliminar_borrador(tenant.empresa_id, nomina_id)


@router.post("/{nomina_id}/enviar", response_model=NominaResponse)
def enviar_nomina(
    nomina_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nomina = NominaService(db).enviar(tenant.empresa_id, nomina_id)
    return NominaResponse.from_model(nomina)


@router.post("/{nomina_id}/anular", response_model=NominaResponse)
def anular_nomina(
    nomina_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    nomina = NominaService(db).anular(tenant.empresa_id, nomina_id)
    return NominaResponse.from_model(nomina)


@router.post("/{nomina_id}/enviar-correo", status_code=204)
def enviar_nomina_por_correo(
    nomina_id: uuid.UUID,
    body: EnviarPorCorreoRequest | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    NominaService(db).enviar_por_correo(tenant.empresa_id, nomina_id, body.correo if body else None)


@router.get("/{nomina_id}/xml")
def obtener_url_xml(
    nomina_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Devuelve la URL S3 firmada (temporal) del XML -- se pide fresca a
    Alegra en cada llamada, nunca se persiste."""
    url = NominaService(db).obtener_url_xml(tenant.empresa_id, nomina_id)
    return {"url": url}


@router.get("/{nomina_id}/representacion.pdf")
def obtener_representacion_pdf(
    nomina_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    pdf_bytes = NominaService(db).generar_pdf_representacion(tenant.empresa_id, nomina_id)
    return Response(content=pdf_bytes, media_type="application/pdf")
