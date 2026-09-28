import pytest
from fastapi import HTTPException

from src.application.habilitacion_dian_service import HabilitacionDianService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.core.security import hash_password
from src.infrastructure.db.models import Empresa, HabilitacionDian, UsuarioEmpresa

TEST_SET_ID = "a70562e0-631e-4ceb-aa65-36887b57dc17"


class _FakeAlegraClient:
    """governmentStatus y respuestas de /test-sets con la forma real vista en
    el sandbox (ver docs/alegra-investigacion.md, seccion Habilitacion)."""

    def __init__(self, government_status=None):
        self.government_status = government_status or {}
        self.company_calls = 0
        self.test_set_response = {"id": "ts-1", "governmentId": TEST_SET_ID, "status": "ACCEPTED", "errors": []}
        self.test_set_error: Exception | None = None
        self.test_set_consultado: dict | None = None
        self.last_test_set: tuple | None = None
        self.company_error: Exception | None = None

    def get_company(self, company_id):
        self.company_calls += 1
        if self.company_error:
            raise self.company_error
        return {"id": company_id, "governmentStatus": self.government_status}

    def create_test_set(self, company_id, document_type="invoices", government_id=None):
        self.last_test_set = (company_id, document_type, government_id)
        if self.test_set_error:
            raise self.test_set_error
        return self.test_set_response

    def get_test_set(self, test_set_id):
        return self.test_set_consultado


def _crear_empresa(db_session, **overrides) -> Empresa:
    data = {
        "razon_social": "Empresa Habilitacion SAS",
        "numero_identificacion": "900777777",
        "digito_verificacion": "1",
        "correo_electronico": "habilitacion@example.com",
        "estado": "activo",
        "id_alegra": "alegra-hab-1",
    }
    data.update(overrides)
    empresa = Empresa(**data)
    db_session.add(empresa)
    db_session.commit()
    db_session.refresh(empresa)
    return empresa


def _estados(habilitaciones):
    return {h.tipo: h.estado for h in habilitaciones}


def test_listar_toma_el_estado_real_de_alegra(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED", "payrolls": "IN_PROCESS"})

    habilitaciones = HabilitacionDianService(db_session, alegra).listar(empresa.id)

    assert _estados(habilitaciones) == {"facturacion": "habilitada", "nomina": "en_proceso"}


def test_listar_tipo_ausente_en_government_status_es_no_habilitada(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED"})

    habilitaciones = HabilitacionDianService(db_session, alegra).listar(empresa.id)

    assert _estados(habilitaciones)["nomina"] == "no_habilitada"


def test_listar_si_alegra_falla_devuelve_la_cache(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED"})
    service = HabilitacionDianService(db_session, alegra)
    service.listar(empresa.id)

    alegra.company_error = AlegraTransientError("timeout")
    habilitaciones = service.listar(empresa.id)

    assert _estados(habilitaciones) == {"facturacion": "habilitada", "nomina": "no_habilitada"}


def test_listar_sin_id_alegra_no_llama_a_alegra(db_session):
    empresa = _crear_empresa(db_session, id_alegra=None)
    alegra = _FakeAlegraClient()

    habilitaciones = HabilitacionDianService(db_session, alegra).listar(empresa.id)

    assert alegra.company_calls == 0
    assert _estados(habilitaciones) == {"facturacion": "no_habilitada", "nomina": "no_habilitada"}


def test_listar_actualiza_un_set_de_pruebas_en_curso(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"payrolls": "IN_PROCESS"})
    alegra.test_set_response = {"id": "ts-9", "governmentId": TEST_SET_ID, "status": "WAITING_RESPONSE", "errors": []}
    service = HabilitacionDianService(db_session, alegra)
    service.enviar_set_pruebas(empresa.id, "nomina", TEST_SET_ID)

    alegra.government_status = {"payrolls": "UNAUTHORIZED"}
    alegra.test_set_consultado = {"id": "ts-9", "status": "REJECTED", "errors": ["Regla X", "Regla X", ""]}
    nomina = next(h for h in service.listar(empresa.id) if h.tipo == "nomina")

    assert nomina.estado == "no_habilitada"
    assert nomina.estado_set_pruebas == "REJECTED"
    assert nomina.errores_set_pruebas == ["Regla X"]


def test_enviar_set_pruebas_aceptado_habilita_el_tipo(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient()

    habilitacion = HabilitacionDianService(db_session, alegra).enviar_set_pruebas(empresa.id, "nomina", TEST_SET_ID)

    assert alegra.last_test_set == ("alegra-hab-1", "payrolls", TEST_SET_ID)
    assert habilitacion.estado == "habilitada"
    assert habilitacion.test_set_id == TEST_SET_ID
    assert habilitacion.alegra_test_set_id == "ts-1"
    assert habilitacion.fecha_envio_set_pruebas is not None


def test_enviar_set_pruebas_fallido_guarda_errores_sin_habilitar(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient()
    alegra.test_set_response = {
        "id": "ts-2",
        "governmentId": TEST_SET_ID,
        "status": "FAILED",
        "errors": ["Invalid governmentId", "Invalid governmentId"],
    }

    habilitacion = HabilitacionDianService(db_session, alegra).enviar_set_pruebas(
        empresa.id, "facturacion", TEST_SET_ID
    )

    assert habilitacion.estado == "no_habilitada"
    assert habilitacion.estado_set_pruebas == "FAILED"
    assert habilitacion.errores_set_pruebas == ["Invalid governmentId"]


def test_enviar_set_pruebas_ya_aprobado_en_alegra_marca_habilitada(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient()
    alegra.test_set_error = AlegraApiError(
        400,
        {
            "errors": [{"code": "AEP4007", "message": "Test set in this company has already been approved."}],
            "approvedTestSet": {"id": "ts-viejo", "governmentId": TEST_SET_ID, "status": "ACCEPTED", "errors": []},
        },
    )

    habilitacion = HabilitacionDianService(db_session, alegra).enviar_set_pruebas(
        empresa.id, "facturacion", TEST_SET_ID
    )

    assert habilitacion.estado == "habilitada"
    assert habilitacion.alegra_test_set_id == "ts-viejo"


def test_enviar_set_pruebas_error_de_alegra_responde_502(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient()
    alegra.test_set_error = AlegraApiError(400, {"errors": [{"message": "instance.governmentId does not match"}]})

    with pytest.raises(HTTPException) as exc:
        HabilitacionDianService(db_session, alegra).enviar_set_pruebas(empresa.id, "facturacion", TEST_SET_ID)

    assert exc.value.status_code == 502


def test_enviar_set_pruebas_ya_habilitada_falla_409(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED"})
    service = HabilitacionDianService(db_session, alegra)
    service.listar(empresa.id)

    with pytest.raises(HTTPException) as exc:
        service.enviar_set_pruebas(empresa.id, "facturacion", TEST_SET_ID)

    assert exc.value.status_code == 409
    assert alegra.last_test_set is None


def test_enviar_set_pruebas_sin_id_alegra_falla_409(db_session):
    empresa = _crear_empresa(db_session, id_alegra=None)

    with pytest.raises(HTTPException) as exc:
        HabilitacionDianService(db_session, _FakeAlegraClient()).enviar_set_pruebas(
            empresa.id, "facturacion", TEST_SET_ID
        )

    assert exc.value.status_code == 409


def test_verificar_habilitada_consulta_alegra_la_primera_vez_y_luego_usa_cache(db_session):
    """Empresas habilitadas antes de este modulo: no tienen fila todavia, el
    primer envio la llena desde Alegra y los siguientes no la consultan."""
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED"})
    service = HabilitacionDianService(db_session, alegra)

    service.verificar_habilitada(empresa.id, "facturacion")
    service.verificar_habilitada(empresa.id, "facturacion")

    assert alegra.company_calls == 1


def test_verificar_habilitada_bloquea_el_tipo_no_habilitado(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED"})

    with pytest.raises(HTTPException) as exc:
        HabilitacionDianService(db_session, alegra).verificar_habilitada(empresa.id, "nomina")

    assert exc.value.status_code == 409
    assert "nómina electrónica" in exc.value.detail


def test_verificar_habilitada_alegra_caido_sin_cache_responde_502(db_session):
    empresa = _crear_empresa(db_session)
    alegra = _FakeAlegraClient()
    alegra.company_error = AlegraTransientError("timeout")

    with pytest.raises(HTTPException) as exc:
        HabilitacionDianService(db_session, alegra).verificar_habilitada(empresa.id, "facturacion")

    assert exc.value.status_code == 502


def test_rutas_de_habilitacion_por_http(api_client, db_session, monkeypatch):
    empresa = _crear_empresa(db_session)
    db_session.add(
        UsuarioEmpresa(
            empresa_id=empresa.id,
            nombre="Usuario Hab",
            email="usuario-hab@example.com",
            password_hash=hash_password("ClaveHab123!"),
            estado="activo",
        )
    )
    db_session.commit()
    alegra = _FakeAlegraClient({"invoices": "AUTHORIZED"})
    monkeypatch.setattr("src.application.habilitacion_dian_service.AlegraClient", lambda: alegra)

    login = api_client.post("/api/v1/auth/login", json={"email": "usuario-hab@example.com", "password": "ClaveHab123!"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    listado = api_client.get("/api/v1/tenant/habilitacion", headers=headers)
    assert listado.status_code == 200
    assert {h["tipo"]: h["estado"] for h in listado.json()} == {"facturacion": "habilitada", "nomina": "no_habilitada"}

    invalido = api_client.post(
        "/api/v1/tenant/habilitacion/nomina/set-pruebas", json={"test_set_id": "no-es-valido"}, headers=headers
    )
    assert invalido.status_code == 422

    enviado = api_client.post(
        "/api/v1/tenant/habilitacion/nomina/set-pruebas", json={"test_set_id": TEST_SET_ID}, headers=headers
    )
    assert enviado.status_code == 200
    assert enviado.json()["estado"] == "habilitada"
    assert db_session.query(HabilitacionDian).filter_by(empresa_id=empresa.id).count() == 2
