import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.application.auth_service import AuthService
from src.core.security import generate_opaque_token, hash_password
from src.domain.usuario_admin import ActualizarUsuarioAdminRequest, CrearUsuarioAdminRequest
from src.infrastructure.db.models import UsuarioAdmin


class UsuarioAdminService:
    """CRUD de staff interno. No hay flujo de Supabase Auth aqui (el sistema
    nuevo no usa Supabase para nada) -- el usuario se crea con un password_hash
    no utilizable y se le emite el mismo token de "definir contrasena" que ya
    usa la recuperacion de contrasena (AuthService.forgot_password), en vez de
    construir un flujo de invitacion nuevo desde cero."""

    def __init__(self, db: Session):
        self.db = db

    def listar(self) -> list[UsuarioAdmin]:
        return list(self.db.execute(select(UsuarioAdmin).order_by(UsuarioAdmin.creado.desc())).scalars().all())

    def crear(self, data: CrearUsuarioAdminRequest) -> UsuarioAdmin:
        existente = self.db.query(UsuarioAdmin).filter(UsuarioAdmin.email == data.email).one_or_none()
        if existente is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un usuario con ese correo.")

        usuario = UsuarioAdmin(
            nombre=data.nombre,
            email=data.email,
            password_hash=hash_password(generate_opaque_token()),
            rol="admin",
            estado="activo",
        )
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)

        AuthService(self.db).forgot_password(usuario.email, "admin")
        return usuario

    def actualizar(self, usuario_id: uuid.UUID, data: ActualizarUsuarioAdminRequest) -> UsuarioAdmin:
        usuario = self.db.get(UsuarioAdmin, usuario_id)
        if usuario is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado.")

        usuario.nombre = data.nombre
        usuario.estado = data.estado
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario
