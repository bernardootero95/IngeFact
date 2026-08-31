import pytest
from fastapi import HTTPException

from src.application.reference_table_service import ReferenceTableService, SincronizarReferenceTableService
from src.domain.reference_table import ReferenceRecordRequest
from src.infrastructure.db.models import REFERENCE_TABLE_MODELS


class FakeAlegraClient:
    def __init__(self, catalogs):
        self.catalogs = catalogs
        self.calls = []

    def get_reference_catalog(self, path, key):
        self.calls.append((path, key))
        return self.catalogs.get(path, [])


def test_crear_y_listar_registro_de_una_tabla_simple(db_session):
    service = ReferenceTableService(db_session)
    service.crear("departamentos", ReferenceRecordRequest(code="11", value="Bogotá"))

    registros = service.listar("departamentos")

    assert len(registros) == 1
    assert registros[0].code == "11"
    assert registros[0].value == "Bogotá"


def test_crear_municipio_incluye_columnas_extra(db_session):
    service = ReferenceTableService(db_session)
    registro = service.crear(
        "municipios",
        ReferenceRecordRequest(
            code="11001", value="Bogotá, D.C.", department_code="11", department_value="Bogotá"
        ),
    )

    assert registro.department_code == "11"
    assert registro.department_value == "Bogotá"


def test_listar_tabla_desconocida_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        ReferenceTableService(db_session).listar("tabla_inventada")
    assert exc_info.value.status_code == 404


def test_listar_filtra_por_search_en_code_o_value(db_session):
    service = ReferenceTableService(db_session)
    service.crear("departamentos", ReferenceRecordRequest(code="11", value="Bogotá"))
    service.crear("departamentos", ReferenceRecordRequest(code="05", value="Antioquia"))

    resultado = service.listar("departamentos", search="Bogot")

    assert len(resultado) == 1
    assert resultado[0].code == "11"


def test_actualizar_registro(db_session):
    service = ReferenceTableService(db_session)
    creado = service.crear("departamentos", ReferenceRecordRequest(code="11", value="Bogotá"))

    actualizado = service.actualizar(
        "departamentos", creado.id, ReferenceRecordRequest(code="11", value="Bogotá D.C.", estado="inactivo")
    )

    assert actualizado.value == "Bogotá D.C."
    assert actualizado.estado == "inactivo"


def test_sincronizar_crea_registros_desde_alegra(db_session):
    fake_client = FakeAlegraClient(
        {"/dian/departments": [{"code": 11, "value": "Bogotá"}, {"code": 5, "value": "Antioquia"}]}
    )
    service = SincronizarReferenceTableService(db_session, alegra_client=fake_client)

    procesados = service.sincronizar("departamentos")

    assert procesados == 2
    model = REFERENCE_TABLE_MODELS["departamentos"]
    assert db_session.query(model).count() == 2


def test_sincronizar_dedupe_code_repetido_en_el_mismo_lote(db_session):
    fake_client = FakeAlegraClient(
        {
            "/dian/departments": [
                {"code": 11, "value": "Bogotá Viejo"},
                {"code": 11, "value": "Bogotá Repetido"},
            ]
        }
    )
    service = SincronizarReferenceTableService(db_session, alegra_client=fake_client)

    procesados = service.sincronizar("departamentos")

    assert procesados == 1
    model = REFERENCE_TABLE_MODELS["departamentos"]
    registro = db_session.query(model).filter(model.code == "11").one()
    assert registro.value == "Bogotá Repetido"


def test_sincronizar_municipios_incluye_department_code(db_session):
    fake_client = FakeAlegraClient(
        {
            "/dian/municipalities": [
                {"code": "11001", "value": "Bogotá, D.C.", "departmentCode": 11, "departmentValue": "Bogotá"}
            ]
        }
    )
    service = SincronizarReferenceTableService(db_session, alegra_client=fake_client)

    service.sincronizar("municipios")

    model = REFERENCE_TABLE_MODELS["municipios"]
    registro = db_session.query(model).filter(model.code == "11001").one()
    assert registro.department_code == "11"
    assert registro.department_value == "Bogotá"


def test_sincronizar_tabla_desconocida_404(db_session):
    with pytest.raises(HTTPException) as exc_info:
        SincronizarReferenceTableService(db_session, alegra_client=FakeAlegraClient({})).sincronizar(
            "tabla_inventada"
        )
    assert exc_info.value.status_code == 404
