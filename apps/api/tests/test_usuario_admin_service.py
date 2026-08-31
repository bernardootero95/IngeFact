import uuid

import pytest
from fastapi import HTTPException

from src.application.usuario_admin_service import UsuarioAdminService
from src.domain.usuario_admin import ActualizarUsuarioAdminRequest, CrearUsuarioAdminRequest
from src.infrastructure.db.models import PasswordResetToken, UsuarioAdmin


def test_crear_usuario_admin_exitoso(db_session):
    data = CrearUsuarioAdminRequest(nombre="Nuevo Admin", email="nuevo-admin@example.com")
    usuario = UsuarioAdminService(db_session).crear(data)

    assert usuario.nombre == "Nuevo Admin"
    assert usuario.email == "nuevo-admin@example.com"
    assert usuario.rol == "admin"
    assert usuario.estado == "activo"

    # Se emitio un token de "definir contrasena" (mismo mecanismo que forgot-password).
    token = (
        db_session.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == usuario.id, PasswordResetToken.user_type == "admin")
        .one_or_none()
    )
    assert token is not None


def test_crear_usuario_admin_email_duplicado(db_session):
    service = UsuarioAdminService(db_session)
    service.crear(CrearUsuarioAdminRequest(nombre="Admin Uno", email="repetido@example.com"))

    with pytest.raises(HTTPException) as exc_info:
        service.crear(CrearUsuarioAdminRequest(nombre="Admin Dos", email="repetido@example.com"))
    assert exc_info.value.status_code == 409


def test_listar_usuarios_admin_ordenados_por_creado_desc(db_session):
    service = UsuarioAdminService(db_session)
    service.crear(CrearUsuarioAdminRequest(nombre="Admin Uno", email="uno@example.com"))
    service.crear(CrearUsuarioAdminRequest(nombre="Admin Dos", email="dos@example.com"))

    usuarios = service.listar()

    assert len(usuarios) == 2
    assert usuarios[0].email == "dos@example.com"


def test_actualizar_usuario_admin_no_toca_email(db_session):
    service = UsuarioAdminService(db_session)
    usuario = service.crear(CrearUsuarioAdminRequest(nombre="Admin Uno", email="uno@example.com"))

    actualizado = service.actualizar(
        usuario.id, ActualizarUsuarioAdminRequest(nombre="Admin Uno Editado", estado="inactivo")
    )

    assert actualizado.nombre == "Admin Uno Editado"
    assert actualizado.estado == "inactivo"
    assert actualizado.email == "uno@example.com"


def test_actualizar_usuario_admin_404_si_no_existe(db_session):
    service = UsuarioAdminService(db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.actualizar(uuid.uuid4(), ActualizarUsuarioAdminRequest(nombre="No Existe", estado="activo"))
    assert exc_info.value.status_code == 404
