import uuid

from fastapi import APIRouter, Depends
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


@router.post("/desde-compra/{compra_id}", response_model=DocumentoSoporteResponse, status_code=201)
def crear_desde_compra(
    compra_id: uuid.UUID,
    db: Session = Depends(get_db),
    tenant: CurrentTenant = Depends(get_current_tenant),
):
    documento = DocumentoSoporteService(db).crear_desde_compra(tenant.empresa_id, compra_id)
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
