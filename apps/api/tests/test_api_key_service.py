import uuid

import pytest
from fastapi import HTTPException

from src.application.api_key_service import ApiKeyService
from src.core.security import hash_opaque_token
from src.infrastructure.db.models import Empresa, UsuarioAdmin


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "estado": "activo",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _crear_admin(db_session) -> UsuarioAdmin:
    admin = UsuarioAdmin(
        nombre="Staff Test", email=f"staff-{uuid.uuid4()}@example.com", password_hash="hash", estado="activo"
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def test_crear_devuelve_key_en_claro_y_no_la_persiste(db_session):
    empresa = _crear_empresa(db_session)
    admin = _crear_admin(db_session)
    service = ApiKeyService(db_session)

    registro, key_en_claro = service.crear(empresa.id, "Integracion Test", admin.id)

    assert key_en_claro.startswith("ingf_")
    assert registro.prefijo == key_en_claro[:12]
    assert registro.key_hash == hash_opaque_token(key_en_claro)
    assert registro.key_hash != key_en_claro
    assert registro.revocada is None


def test_crear_con_empresa_inexistente_falla(db_session):
    admin = _crear_admin(db_session)
    service = ApiKeyService(db_session)

    with pytest.raises(HTTPException) as exc:
        service.crear(uuid.uuid4(), "Integracion Test", admin.id)

    assert exc.value.status_code == 404


def test_listar_solo_devuelve_las_de_esa_empresa(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900222222", digito_verificacion="2")
    admin = _crear_admin(db_session)
    service = ApiKeyService(db_session)

    service.crear(empresa_a.id, "Key A", admin.id)
    service.crear(empresa_b.id, "Key B", admin.id)

    keys_a = service.listar(empresa_a.id)
    assert len(keys_a) == 1
    assert keys_a[0].nombre == "Key A"


def test_revocar_es_idempotente(db_session):
    empresa = _crear_empresa(db_session)
    admin = _crear_admin(db_session)
    service = ApiKeyService(db_session)
    registro, _ = service.crear(empresa.id, "Integracion Test", admin.id)

    service.revocar(empresa.id, registro.id)
    primera_revocacion = registro.revocada
    assert primera_revocacion is not None

    service.revocar(empresa.id, registro.id)
    assert registro.revocada == primera_revocacion


def test_revocar_key_de_otra_empresa_falla(db_session):
    empresa_a = _crear_empresa(db_session)
    empresa_b = _crear_empresa(db_session, numero_identificacion="900222222", digito_verificacion="2")
    admin = _crear_admin(db_session)
    service = ApiKeyService(db_session)
    registro, _ = service.crear(empresa_a.id, "Key A", admin.id)

    with pytest.raises(HTTPException) as exc:
        service.revocar(empresa_b.id, registro.id)

    assert exc.value.status_code == 404
