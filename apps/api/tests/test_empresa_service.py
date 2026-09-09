import pytest

from src.application.empresa_service import CreateEmpresaAlegraService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.core.security import verify_password
from src.domain.empresa import CrearEmpresaRequest
from src.infrastructure.db.models import CompanyStatus, Empresa, UsuarioEmpresa


class FakeAlegraClient:
    def __init__(self, company_result=None, company_exc=None, test_set_result=None, fail_times=0):
        self.company_result = company_result or {"id": "alegra-co-1"}
        self.company_exc = company_exc
        self.test_set_result = test_set_result or {"id": "ts-1", "status": "ACCEPTED"}
        self.fail_times = fail_times
        self.calls = 0

    def create_company(self, payload):
        self.calls += 1
        if self.fail_times and self.calls <= self.fail_times:
            raise AlegraTransientError("timeout simulado")
        if self.company_exc:
            raise self.company_exc
        return self.company_result

    def create_test_set(self, company_id, document_type="invoices"):
        return self.test_set_result


def _valid_request(**overrides):
    data = {
        "razon_social": "Empresa Demo SAS",
        "numero_identificacion": "900618467",
        "digito_verificacion": "4",
        "correo_electronico": "demo@example.com",
        "nombre_usuario": "Persona Demo",
    }
    data.update(overrides)
    return CrearEmpresaRequest(**data)


def test_crear_empresa_exitosa(db_session, monkeypatch, request):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    monkeypatch.setenv("ALEGRA_ENV", "sandbox")
    from src.core.config import get_settings

    get_settings.cache_clear()
    request.addfinalizer(get_settings.cache_clear)
    fake_client = FakeAlegraClient()
    service = CreateEmpresaAlegraService(db_session, alegra_client=fake_client)

    empresa = service.crear(_valid_request())

    assert empresa.estado == "activo"
    assert empresa.id_alegra == "alegra-co-1"

    historial = db_session.query(CompanyStatus).filter(CompanyStatus.empresa_id == empresa.id).all()
    estados = [h.estado for h in historial]
    assert "creado_en_alegra" in estados
    assert "test_set_creado" in estados


def test_crear_empresa_nit_duplicado(db_session, monkeypatch):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    service = CreateEmpresaAlegraService(db_session, alegra_client=FakeAlegraClient())
    service.crear(_valid_request())

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        service.crear(_valid_request())
    assert exc_info.value.status_code == 409


def test_crear_empresa_error_alegra_definitivo(db_session, monkeypatch):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    error = AlegraApiError(400, {"errors": [{"message": "instance requires property \"dv\""}]})
    fake_client = FakeAlegraClient(company_exc=error)
    service = CreateEmpresaAlegraService(db_session, alegra_client=fake_client)

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        service.crear(_valid_request())
    assert exc_info.value.status_code == 502

    empresa = db_session.query(Empresa).filter(Empresa.numero_identificacion == "900618467").one()
    assert empresa.estado == "error_alegra"
    assert fake_client.calls == 1  # error definitivo: no reintenta


def test_crear_empresa_reintenta_y_se_recupera(db_session, monkeypatch):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    fake_client = FakeAlegraClient(fail_times=2)  # falla 2 veces, la 3ra funciona
    service = CreateEmpresaAlegraService(db_session, alegra_client=fake_client)

    empresa = service.crear(_valid_request())

    assert empresa.estado == "activo"
    assert fake_client.calls == 3


def test_crear_empresa_agota_reintentos(db_session, monkeypatch):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    fake_client = FakeAlegraClient(fail_times=99)  # siempre falla
    service = CreateEmpresaAlegraService(db_session, alegra_client=fake_client)

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        service.crear(_valid_request())
    assert exc_info.value.status_code == 502
    assert fake_client.calls == 6  # 1 intento inicial + 5 reintentos

    empresa = db_session.query(Empresa).filter(Empresa.numero_identificacion == "900618467").one()
    assert empresa.estado == "error_alegra"


def test_crear_empresa_provisiona_usuario_tenant_con_clave_temporal(db_session, monkeypatch, fake_email_client):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    service = CreateEmpresaAlegraService(db_session, alegra_client=FakeAlegraClient(), email_client=fake_email_client)

    empresa = service.crear(_valid_request())

    usuario = db_session.query(UsuarioEmpresa).filter(UsuarioEmpresa.empresa_id == empresa.id).one()
    assert usuario.nombre == "Persona Demo"
    assert usuario.email == "demo@example.com"
    assert usuario.debe_cambiar_password is True

    assert len(fake_email_client.sent) == 1
    correo = fake_email_client.sent[0]
    assert correo["to"] == "demo@example.com"
    # La clave temporal viaja en el cuerpo del correo -- confirma que el hash
    # guardado corresponde a la misma clave que se envio.
    import re

    clave_temporal = re.search(r"font-family:monospace;\">([^<]+)</td>", correo["html"]).group(1)
    assert verify_password(clave_temporal, usuario.password_hash)


def test_crear_empresa_email_usuario_duplicado(db_session, monkeypatch):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    otra_empresa = Empresa(
        razon_social="Otra Empresa",
        numero_identificacion="900000001",
        digito_verificacion="1",
        correo_electronico="demo@example.com",
        estado="activo",
    )
    db_session.add(otra_empresa)
    db_session.commit()
    db_session.add(
        UsuarioEmpresa(
            empresa_id=otra_empresa.id,
            nombre="Ya Existe",
            email="demo@example.com",
            password_hash="hash-cualquiera",
        )
    )
    db_session.commit()

    service = CreateEmpresaAlegraService(db_session, alegra_client=FakeAlegraClient())

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        service.crear(_valid_request())
    assert exc_info.value.status_code == 409


def test_reintentar_manual_tras_error(db_session, monkeypatch):
    monkeypatch.setattr("src.application.empresa_service.time.sleep", lambda _: None)
    failing_client = FakeAlegraClient(fail_times=99)
    service = CreateEmpresaAlegraService(db_session, alegra_client=failing_client)

    from fastapi import HTTPException

    with pytest.raises(HTTPException):
        service.crear(_valid_request())

    empresa = db_session.query(Empresa).filter(Empresa.numero_identificacion == "900618467").one()

    working_client = FakeAlegraClient()
    service_recovery = CreateEmpresaAlegraService(db_session, alegra_client=working_client)
    recovered = service_recovery.reintentar(empresa.id)

    assert recovered.estado == "activo"
    assert recovered.id_alegra == "alegra-co-1"
