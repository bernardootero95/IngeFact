from src.application.empresa_sync_service import SincronizarEmpresasAlegraService
from src.infrastructure.db.models import Empresa


class FakeAlegraClient:
    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    def list_companies(self, from_id=0, limit=80):
        self.calls.append((from_id, limit))
        return self.pages.pop(0)


def _company(id_, identification, name="Empresa Demo", regime="R-99-PN"):
    return {
        "id": id_,
        "name": name,
        "tradeName": None,
        "identification": identification,
        "dv": "4",
        "identificationType": "31",
        "email": "demo@example.com",
        "phone": "3000000000",
        "address": {"address": "Calle 1", "department": "11", "city": "11001"},
        "organizationType": 1,
        "regimeCode": regime,
    }


def test_sincronizar_sin_empresas_en_alegra(db_session):
    fake_client = FakeAlegraClient([{"companies": [], "metadata": {"results_count": 0}}])
    service = SincronizarEmpresasAlegraService(db_session, alegra_client=fake_client)

    procesadas = service.sincronizar()

    assert procesadas == 0


def test_sincronizar_crea_empresas_nuevas(db_session):
    fake_client = FakeAlegraClient(
        [{"companies": [_company("alegra-1", "900618467")], "metadata": {"results_count": 1}}]
    )
    service = SincronizarEmpresasAlegraService(db_session, alegra_client=fake_client)

    procesadas = service.sincronizar()

    assert procesadas == 1
    empresa = db_session.query(Empresa).filter(Empresa.numero_identificacion == "900618467").one()
    assert empresa.id_alegra == "alegra-1"
    assert empresa.estado == "activo"


def test_sincronizar_actualiza_empresa_existente_por_nit(db_session):
    existente = Empresa(
        razon_social="Nombre Viejo",
        numero_identificacion="900618467",
        digito_verificacion="4",
        estado="error_alegra",
    )
    db_session.add(existente)
    db_session.commit()

    fake_client = FakeAlegraClient(
        [{"companies": [_company("alegra-1", "900618467", name="Nombre Nuevo")], "metadata": {"results_count": 1}}]
    )
    service = SincronizarEmpresasAlegraService(db_session, alegra_client=fake_client)

    procesadas = service.sincronizar()

    assert procesadas == 1
    todas = db_session.query(Empresa).filter(Empresa.numero_identificacion == "900618467").all()
    assert len(todas) == 1  # actualizo, no duplico
    assert todas[0].razon_social == "Nombre Nuevo"
    assert todas[0].estado == "activo"


def test_sincronizar_dedupe_nit_repetido_en_el_mismo_lote(db_session):
    # Visto en el sandbox real de Alegra: el mismo NIT puede aparecer dos veces
    # en una sola pagina. Sin deduplicar, el upsert masivo revienta con
    # "ON CONFLICT DO UPDATE command cannot affect row a second time".
    fake_client = FakeAlegraClient(
        [
            {
                "companies": [
                    _company("alegra-1", "900618467", name="Nombre Viejo"),
                    _company("alegra-2", "900618467", name="Nombre Repetido"),
                ],
                "metadata": {"results_count": 2},
            }
        ]
    )
    service = SincronizarEmpresasAlegraService(db_session, alegra_client=fake_client)

    procesadas = service.sincronizar()

    assert procesadas == 1
    empresa = db_session.query(Empresa).filter(Empresa.numero_identificacion == "900618467").one()
    assert empresa.razon_social == "Nombre Repetido"  # se queda con la ultima ocurrencia


def test_sincronizar_pagina_hasta_agotar_resultados(db_session):
    fake_client = FakeAlegraClient(
        [
            {"companies": [_company("a1", "900000001")], "metadata": {"results_count": 1, "to": "a1"}},
            {"companies": [_company("a2", "900000002")], "metadata": {"results_count": 1}},
        ]
    )
    # Ambas paginas simulan estar "llenas" respecto a un limit chico para forzar una segunda vuelta.
    fake_client.pages[0]["metadata"]["results_count"] = SincronizarEmpresasAlegraService.PAGE_SIZE
    service = SincronizarEmpresasAlegraService(db_session, alegra_client=fake_client)

    procesadas = service.sincronizar()

    assert procesadas == 2
    assert len(fake_client.calls) == 2
    assert fake_client.calls[1][0] == "a1"  # la segunda pagina pidio from=a1
