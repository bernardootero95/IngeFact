import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.usuario_admin_service import UsuarioAdminService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.usuario_admin import ActualizarUsuarioAdminRequest, CrearUsuarioAdminRequest, UsuarioAdminResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/admin/usuarios", tags=["usuarios-admin"])


@router.get("", response_model=list[UsuarioAdminResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    return UsuarioAdminService(db).listar()


@router.post("", response_model=UsuarioAdminResponse, status_code=201)
def crear_usuario(
    body: CrearUsuarioAdminRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    return UsuarioAdminService(db).crear(body)


@router.patch("/{usuario_id}", response_model=UsuarioAdminResponse)
def actualizar_usuario(
    usuario_id: uuid.UUID,
    body: ActualizarUsuarioAdminRequest,
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    return UsuarioAdminService(db).actualizar(usuario_id, body)
