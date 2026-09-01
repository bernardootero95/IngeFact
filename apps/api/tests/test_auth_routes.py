import uuid

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.application.auth_service import AuthService
from src.core.security import hash_password
from src.domain.auth import ResetPasswordRequest
from src.infrastructure.db.models import Empresa, UsuarioAdmin, UsuarioEmpresa


@pytest.fixture
def admin_user(db_session):
    user = UsuarioAdmin(
        nombre="Staff Test",
        email="staff@ingefact.test",
        password_hash=hash_password("Sandbox123!"),
        rol="admin",
        estado="activo",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def tenant_user(db_session):
    empresa = Empresa(
        razon_social="Empresa Demo",
        numero_identificacion="900123456",
        digito_verificacion="1",
        correo_electronico="empresa@ingefact.test",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    user = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Tenant Test",
        email="tenant@ingefact.test",
        password_hash=hash_password("Sandbox123!"),
        estado="activo",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user, empresa


def test_login_admin_success(db_session, admin_user):
    tokens = AuthService(db_session).login_admin("staff@ingefact.test", "Sandbox123!")
    assert tokens.access_token
    assert tokens.refresh_token


def test_login_admin_wrong_password(db_session, admin_user):
    with pytest.raises(HTTPException) as exc_info:
        AuthService(db_session).login_admin("staff@ingefact.test", "clave-incorrecta")
    assert exc_info.value.status_code == 401


def test_login_admin_unknown_email(db_session):
    with pytest.raises(HTTPException) as exc_info:
        AuthService(db_session).login_admin("no-existe@ingefact.test", "Sandbox123!")
    assert exc_info.value.status_code == 401


def test_login_tenant_success(db_session, tenant_user):
    _user, _empresa = tenant_user
    tokens = AuthService(db_session).login_tenant("tenant@ingefact.test", "Sandbox123!")
    assert tokens.access_token
    assert tokens.refresh_token


def test_login_tenant_inactive_rejected(db_session, tenant_user):
    user, _empresa = tenant_user
    user.estado = "inactivo"
    db_session.add(user)
    db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        AuthService(db_session).login_tenant("tenant@ingefact.test", "Sandbox123!")
    assert exc_info.value.status_code == 401


def test_refresh_rotates_token(db_session, admin_user):
    service = AuthService(db_session)
    first = service.login_admin("staff@ingefact.test", "Sandbox123!")

    refreshed = service.refresh(first.refresh_token)
    assert refreshed.refresh_token != first.refresh_token

    # El refresh token usado ya no sirve (rotacion / un solo uso).
    with pytest.raises(HTTPException):
        service.refresh(first.refresh_token)


def test_logout_revokes_refresh_token(db_session, admin_user):
    service = AuthService(db_session)
    tokens = service.login_admin("staff@ingefact.test", "Sandbox123!")

    service.logout(tokens.refresh_token)

    with pytest.raises(HTTPException):
        service.refresh(tokens.refresh_token)


def test_refresh_token_reuse_revokes_all_sessions(db_session, admin_user):
    service = AuthService(db_session)

    session_a = service.login_admin("staff@ingefact.test", "Sandbox123!")
    session_b = service.login_admin("staff@ingefact.test", "Sandbox123!")

    # Uso normal de la sesion A: rota su refresh token.
    service.refresh(session_a.refresh_token)

    # Alguien reutiliza el refresh token viejo de la sesion A (robado) --
    # ademas de rechazarlo, debe matar tambien la sesion B, que segia activa.
    with pytest.raises(HTTPException):
        service.refresh(session_a.refresh_token)

    with pytest.raises(HTTPException):
        service.refresh(session_b.refresh_token)


def test_forgot_password_unknown_email_does_not_raise(db_session):
    # No debe revelar si el correo existe o no.
    AuthService(db_session).forgot_password("no-existe@ingefact.test", "admin")


def test_reset_password_with_invalid_token_fails(db_session):
    with pytest.raises(HTTPException):
        AuthService(db_session).reset_password(str(uuid.uuid4()), "NuevaClave123!")


@pytest.mark.parametrize("weak_password", ["short1", "soloLetras", "12345678"])
def test_reset_password_rejects_weak_passwords(weak_password):
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="cualquier-token", new_password=weak_password)


def test_reset_password_accepts_strong_password():
    request = ResetPasswordRequest(token="cualquier-token", new_password="ClaveNueva123!")
    assert request.new_password == "ClaveNueva123!"


def test_forgot_password_invalidates_previous_unused_tokens(db_session, admin_user, monkeypatch):
    service = AuthService(db_session)

    tokens_generados = iter(["token-viejo-sin-usar", "token-nuevo"])
    monkeypatch.setattr(
        "src.application.auth_service.generate_opaque_token", lambda: next(tokens_generados)
    )

    service.forgot_password("staff@ingefact.test", "admin")
    service.forgot_password("staff@ingefact.test", "admin")

    with pytest.raises(HTTPException):
        service.reset_password("token-viejo-sin-usar", "ClaveNueva123!")

    service.reset_password("token-nuevo", "ClaveNueva123!")


def test_forgot_password_does_not_log_token_in_production(db_session, admin_user, monkeypatch, caplog):
    monkeypatch.setattr(
        "src.application.auth_service.generate_opaque_token", lambda: "token-secreto-no-debe-salir"
    )
    service = AuthService(db_session, environment="production")

    with caplog.at_level("INFO"):
        service.forgot_password("staff@ingefact.test", "admin")

    assert "staff@ingefact.test" in caplog.text
    assert "token-secreto-no-debe-salir" not in caplog.text


def test_forgot_password_logs_token_in_development(db_session, admin_user, monkeypatch, caplog):
    monkeypatch.setattr(
        "src.application.auth_service.generate_opaque_token", lambda: "token-de-prueba-visible"
    )
    service = AuthService(db_session, environment="development")

    with caplog.at_level("INFO"):
        service.forgot_password("staff@ingefact.test", "admin")

    assert "token-de-prueba-visible" in caplog.text


def test_forgot_and_reset_password_flow(db_session, admin_user, monkeypatch):
    service = AuthService(db_session)

    captured = {}

    def fake_generate_token():
        captured["token"] = "token-de-prueba-fijo"
        return captured["token"]

    monkeypatch.setattr("src.application.auth_service.generate_opaque_token", fake_generate_token)

    service.forgot_password("staff@ingefact.test", "admin")
    service.reset_password(captured["token"], "ClaveNueva123!")

    # La clave vieja ya no sirve, la nueva si.
    with pytest.raises(HTTPException):
        service.login_admin("staff@ingefact.test", "Sandbox123!")
    tokens = service.login_admin("staff@ingefact.test", "ClaveNueva123!")
    assert tokens.access_token
