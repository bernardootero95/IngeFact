from fastapi.security import HTTPAuthorizationCredentials

from src.core.security import hash_password
from src.infrastructure.db.models import Empresa, UsuarioAdmin, UsuarioEmpresa
from src.presentation.routes.auth import me


def _credentials(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_me_incluye_empresa_id_para_tenant(db_session):
    empresa = Empresa(
        razon_social="Empresa Demo",
        numero_identificacion="900123456",
        digito_verificacion="1",
        estado="activo",
    )
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)

    user = UsuarioEmpresa(
        empresa_id=empresa.id,
        nombre="Tenant Test",
        email="tenant-me@ingefact.test",
        password_hash=hash_password("Sandbox123!"),
        estado="activo",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    from src.application.auth_service import AuthService

    tokens = AuthService(db_session).login_tenant("tenant-me@ingefact.test", "Sandbox123!")
    profile = me(credentials=_credentials(tokens.access_token), db=db_session)

    assert profile.empresa_id == str(empresa.id)
    assert profile.rol == "tenant"


def test_me_no_incluye_empresa_id_para_admin(db_session):
    user = UsuarioAdmin(
        nombre="Staff Test",
        email="staff-me@ingefact.test",
        password_hash=hash_password("Sandbox123!"),
        rol="admin",
        estado="activo",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    from src.application.auth_service import AuthService

    tokens = AuthService(db_session).login_admin("staff-me@ingefact.test", "Sandbox123!")
    profile = me(credentials=_credentials(tokens.access_token), db=db_session)

    assert profile.empresa_id is None
