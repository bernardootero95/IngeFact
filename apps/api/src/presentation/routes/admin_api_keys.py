import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.api_key_service import ApiKeyService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.api_key import ApiKeyCreatedResponse, ApiKeyResponse, CrearApiKeyRequest
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/admin/empresas/{empresa_id}/api-keys", tags=["admin-api-keys"])


@router.get("", response_model=list[ApiKeyResponse])
def listar_api_keys(
    empresa_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    keys = ApiKeyService(db).listar(empresa_id)
    return [ApiKeyResponse.from_model(k) for k in keys]


@router.post("", response_model=ApiKeyCreatedResponse, status_code=201)
def crear_api_key(
    empresa_id: uuid.UUID,
    body: CrearApiKeyRequest,
    db: Session = Depends(get_db),
    admin: CurrentAdmin = Depends(get_current_admin),
):
    registro, key_en_claro = ApiKeyService(db).crear(empresa_id, body.nombre, admin.id)
    return ApiKeyCreatedResponse(**ApiKeyResponse.from_model(registro).model_dump(), api_key=key_en_claro)


@router.delete("/{api_key_id}", status_code=204)
def revocar_api_key(
    empresa_id: uuid.UUID,
    api_key_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    ApiKeyService(db).revocar(empresa_id, api_key_id)
