import uuid

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from src.application.documento_soporte_service import DocumentoSoporteService
from src.core.dependencies import CurrentTenant, get_current_tenant
from src.domain.documento_soporte import (
    ActualizarDocumentoSoporteRequest,
    CrearDocumentoSoporteRequest,
    DocumentoSoporteListItemResponse,
    DocumentoSoporteResponse,
    EnviarDocumentoSoporteRequest,
)
from src.domain.envio_correo import EnviarPorCorreoRequest
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/tenant/documentos-soporte", tags=["tenant"])


@router.get("", response_model=list[DocumentoSoporteListItemResponse])
def listar_documentos_soporte(
    estado: str | None = None,
    proveedor_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    documentos = DocumentoSoporteService(db).listar(tenant.empresa_id, estado=estado, proveedor_id=proveedor_id)
    return [DocumentoSoporteListItemResponse.from_model(d) for d in documentos]


@router.get("/{documento_id}", response_model=DocumentoSoporteResponse)
def obtener_documento_soporte(
    documento_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    documento = DocumentoSoporteService(db).obtener(tenant.empresa_id, documento_id)
    return DocumentoSoporteResponse.from_model(documento)


@router.post("", response_model=DocumentoSoporteResponse, status_code=201)
def crear_borrador(
    body: CrearDocumentoSoporteRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    documento = DocumentoSoporteService(db).crear_borrador(tenant.empresa_id, body)
    return DocumentoSoporteResponse.from_model(documento)


@router.put("/{documento_id}", response_model=DocumentoSoporteResponse)
def actualizar_borrador(
    documento_id: uuid.UUID,
    body: ActualizarDocumentoSoporteRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    documento = DocumentoSoporteService(db).actualizar_borrador(tenant.empresa_id, documento_id, body)
    return DocumentoSoporteResponse.from_model(documento)


@router.delete("/{documento_id}", status_code=204)
def eliminar_borrador(
    documento_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    DocumentoSoporteService(db).eliminar_borrador(tenant.empresa_id, documento_id)


@router.post("/{documento_id}/enviar", response_model=DocumentoSoporteResponse)
def enviar_documento_soporte(
    documento_id: uuid.UUID,
    body: EnviarDocumentoSoporteRequest,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    documento = DocumentoSoporteService(db).enviar(tenant.empresa_id, documento_id, body.forma_pago, body.metodo_pago)
    return DocumentoSoporteResponse.from_model(documento)


@router.post("/{documento_id}/enviar-correo", status_code=204)
def enviar_documento_soporte_por_correo(
    documento_id: uuid.UUID,
    body: EnviarPorCorreoRequest | None = None,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    DocumentoSoporteService(db).enviar_por_correo(tenant.empresa_id, documento_id, body.correo if body else None)


@router.get("/{documento_id}/xml")
def obtener_url_xml(
    documento_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    """Devuelve la URL S3 firmada (temporal) del XML -- se pide fresca a
    Alegra en cada llamada, nunca se persiste."""
    url = DocumentoSoporteService(db).obtener_url_xml(tenant.empresa_id, documento_id)
    return {"url": url}


@router.get("/{documento_id}/representacion.pdf")
def obtener_representacion_pdf(
    documento_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    pdf_bytes = DocumentoSoporteService(db).generar_pdf_representacion(tenant.empresa_id, documento_id)
    return Response(content=pdf_bytes, media_type="application/pdf")


@router.get("/{documento_id}/firma-digital")
def obtener_firma_digital(
    documento_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    firma = DocumentoSoporteService(db).obtener_firma_digital(tenant.empresa_id, documento_id)
    return {"firma_digital": firma}
