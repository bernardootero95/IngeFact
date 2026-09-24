"""Aceptacion de terminos y politica de datos por usuarios tenant: servicio
y flujo HTTP real (login -> /me con terminos pendientes -> aceptar -> /me)."""

import pytest
from fastapi import HTTPException

from src.application.aceptacion_legal_service import AceptacionLegalService
from src.core.legal import VERSION_TERMINOS_VIGENTE
from src.core.security import hash_password
from src.infrastructure.db.models import AceptacionLegal, Empresa, UsuarioAdmin, UsuarioEmpresa

_PASSWORD = "ClaveTenant123!"


@pytest.fixture
def usuario(db_session) -> UsuarioEmpresa:
    empresa = Empresa(
        razon_social="Empresa Demo SAS",
        numero_identificacion="900618467",
        digito_verificacion="4",
        correo_electronico="empresa@example.com",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    usuario = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Tenant",
        email="tenant@example.com",
        password_hash=hash_password(_PASSWORD),
        estado="activo",
        debe_cambiar_password=False,
    )
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


def _aceptar(service, usuario, version=VERSION_TERMINOS_VIGENTE):
    return service.aceptar(
        usuario_id=usuario.id, empresa_id=usuario.empresa_id, version=version, ip="203.0.113.7", user_agent="pytest"
    )


def test_usuario_nuevo_tiene_terminos_pendientes(db_session, usuario):
    assert AceptacionLegalService(db_session).tiene_pendiente(usuario.id) is True


def test_aceptar_registra_evidencia_y_quita_el_pendiente(db_session, usuario):
    service = AceptacionLegalService(db_session)

    aceptacion = _aceptar(service, usuario)

    assert aceptacion.version == VERSION_TERMINOS_VIGENTE
    assert aceptacion.ip == "203.0.113.7"
    assert aceptacion.user_agent == "pytest"
    assert aceptacion.aceptado_en is not None
    assert service.tiene_pendiente(usuario.id) is False


def test_aceptar_dos_veces_no_duplica_la_evidencia(db_session, usuario):
    service = AceptacionLegalService(db_session)

    _aceptar(service, usuario)
    _aceptar(service, usuario)

    assert db_session.query(AceptacionLegal).count() == 1


def test_aceptar_una_version_desactualizada_falla_409(db_session, usuario):
    with pytest.raises(HTTPException) as exc:
        _aceptar(AceptacionLegalService(db_session), usuario, version="2000-01-01")

    assert exc.value.status_code == 409
    assert db_session.query(AceptacionLegal).count() == 0


def test_aceptacion_de_version_anterior_deja_pendiente_la_vigente(db_session, usuario):
    db_session.add(AceptacionLegal(usuario_id=usuario.id, empresa_id=usuario.empresa_id, version="2000-01-01"))
    db_session.commit()

    assert AceptacionLegalService(db_session).tiene_pendiente(usuario.id) is True


def _token(api_client, email, password, *, admin=False):
    path = "/api/v1/auth/admin/login" if admin else "/api/v1/auth/login"
    response = api_client.post(path, json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_flujo_http_me_refleja_pendiente_y_aceptar_lo_resuelve(api_client, usuario):
    headers = _token(api_client, usuario.email, _PASSWORD)

    antes = api_client.get("/api/v1/auth/me", headers=headers).json()
    assert antes["terminos_pendientes"] is True
    assert antes["version_terminos"] == VERSION_TERMINOS_VIGENTE

    respuesta = api_client.post(
        "/api/v1/auth/aceptar-terminos", json={"version": VERSION_TERMINOS_VIGENTE}, headers=headers
    )
    assert respuesta.status_code == 204

    despues = api_client.get("/api/v1/auth/me", headers=headers).json()
    assert despues["terminos_pendientes"] is False


def test_aceptar_terminos_sin_token_falla_401(api_client):
    respuesta = api_client.post("/api/v1/auth/aceptar-terminos", json={"version": VERSION_TERMINOS_VIGENTE})

    assert respuesta.status_code == 401


def test_admin_nunca_tiene_terminos_pendientes(api_client, db_session):
    db_session.add(
        UsuarioAdmin(nombre="Staff", email="staff@example.com", password_hash=hash_password(_PASSWORD), rol="admin")
    )
    db_session.commit()
    headers = _token(api_client, "staff@example.com", _PASSWORD, admin=True)

    me = api_client.get("/api/v1/auth/me", headers=headers).json()

    assert me["terminos_pendientes"] is False
    assert me["version_terminos"] is None
