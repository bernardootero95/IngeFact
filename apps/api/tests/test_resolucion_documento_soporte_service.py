import threading
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.application.resolucion_documento_soporte_service import ResolucionDocumentoSoporteService
from src.core.alegra_client import AlegraApiError, AlegraTransientError
from src.domain.resolucion_documento_soporte import GuardarResolucionDocumentoSoporteRequest
from src.infrastructure.db.models import Empresa, ResolucionDocumentoSoporte
from tests.conftest import TEST_DATABASE_URL


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


def _payload(**overrides) -> GuardarResolucionDocumentoSoporteRequest:
    data = {
        "numero_resolucion": "18760000002",
        "prefijo": "SEDS",
        "rango_minimo": 1,
        "rango_maximo": 1000,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2030, 1, 1),
    }
    data.update(overrides)
    return GuardarResolucionDocumentoSoporteRequest(**data)


def test_guardar_crea_con_consecutivo_en_rango_minimo(db_session):
    empresa = _crear_empresa(db_session)

    resolucion = ResolucionDocumentoSoporteService(db_session).guardar(empresa.id, _payload(rango_minimo=100))

    assert resolucion.consecutivo_actual == 100


def test_guardar_actualiza_y_resetea_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=100))

    actualizada = service.guardar(empresa.id, _payload(rango_minimo=500))

    assert actualizada.consecutivo_actual == 500
    todas = (
        db_session.query(ResolucionDocumentoSoporte)
        .filter(ResolucionDocumentoSoporte.empresa_id == empresa.id)
        .all()
    )
    assert len(todas) == 1  # actualizo la misma fila, no creo una segunda


def test_guardar_bloquea_cambiar_rango_minimo_una_vez_incrementado(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=100, rango_maximo=1000))
    service.incrementar_consecutivo(empresa.id)

    with pytest.raises(HTTPException) as exc_info:
        service.guardar(empresa.id, _payload(rango_minimo=200, rango_maximo=1000))
    assert exc_info.value.status_code == 409


def test_guardar_bloquea_retroceder_consecutivo_ya_incrementado(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=1000))
    service.incrementar_consecutivo(empresa.id)  # usa el 1, consecutivo_actual pasa a 2

    with pytest.raises(HTTPException) as exc_info:
        service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=1000, consecutivo_actual=1))
    assert exc_info.value.status_code == 409


def test_guardar_permite_cargar_resolucion_nueva_cuando_la_vigente_se_agoto(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=2))
    service.incrementar_consecutivo(empresa.id)  # usa el 1
    service.incrementar_consecutivo(empresa.id)  # usa el 2 == rango_maximo: agotada

    renovada = service.guardar(
        empresa.id,
        _payload(numero_resolucion="18760000098", rango_minimo=5000, rango_maximo=6000),
    )

    assert renovada.numero_resolucion == "18760000098"
    assert renovada.rango_minimo == 5000
    assert renovada.consecutivo_actual == 5000
    todas = (
        db_session.query(ResolucionDocumentoSoporte)
        .filter(ResolucionDocumentoSoporte.empresa_id == empresa.id)
        .all()
    )
    assert len(todas) == 1


def test_guardar_sigue_bloqueando_cambio_de_rango_si_aun_quedan_numeros(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=1000))
    service.incrementar_consecutivo(empresa.id)  # usa el 1, muy lejos de agotarse

    with pytest.raises(HTTPException) as exc_info:
        service.guardar(empresa.id, _payload(rango_minimo=5000, rango_maximo=6000))
    assert exc_info.value.status_code == 409


def test_guardar_permite_fijar_consecutivo_actual_manualmente(db_session):
    empresa = _crear_empresa(db_session)

    resolucion = ResolucionDocumentoSoporteService(db_session).guardar(
        empresa.id, _payload(rango_minimo=1, rango_maximo=1000, consecutivo_actual=250)
    )

    assert resolucion.consecutivo_actual == 250


def test_consecutivo_actual_fuera_de_rango_es_invalido():
    with pytest.raises(ValueError):
        _payload(rango_minimo=1, rango_maximo=100, consecutivo_actual=101)


def test_obtener_o_404_sin_resolucion(db_session):
    empresa = _crear_empresa(db_session)
    with pytest.raises(HTTPException) as exc_info:
        ResolucionDocumentoSoporteService(db_session).obtener_o_404(empresa.id)
    assert exc_info.value.status_code == 404


def test_incrementar_consecutivo_se_agota_en_el_rango_maximo(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=2))

    assert service.incrementar_consecutivo(empresa.id) == 1
    assert service.incrementar_consecutivo(empresa.id) == 2

    with pytest.raises(HTTPException) as exc_info:
        service.incrementar_consecutivo(empresa.id)
    assert exc_info.value.status_code == 409


def test_incrementar_consecutivo_devuelve_rango_minimo_la_primera_vez(db_session):
    """Bug real reportado 2026-09-24: el primer documento emitido se saltaba
    rango_minimo porque incrementar_consecutivo devolvia el valor YA
    incrementado (rango_minimo + 1) en vez del numero recien asignado."""
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=100, rango_maximo=1000))

    assert service.incrementar_consecutivo(empresa.id) == 100
    assert service.incrementar_consecutivo(empresa.id) == 101


def test_incrementar_consecutivo_es_seguro_bajo_concurrencia(db_session):
    empresa = _crear_empresa(db_session)
    rango_minimo = 1
    n_hilos = 20
    ResolucionDocumentoSoporteService(db_session).guardar(
        empresa.id, _payload(rango_minimo=rango_minimo, rango_maximo=rango_minimo + n_hilos)
    )

    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    resultados: list[int] = []
    lock = threading.Lock()

    def _incrementar():
        session = SessionLocal()
        try:
            valor = ResolucionDocumentoSoporteService(session).incrementar_consecutivo(empresa.id)
            with lock:
                resultados.append(valor)
        finally:
            session.close()

    hilos = [threading.Thread(target=_incrementar) for _ in range(n_hilos)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    assert sorted(resultados) == list(range(rango_minimo, rango_minimo + n_hilos))


def test_revertir_consecutivo_deshace_el_incremento(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=100, rango_maximo=1000))
    consecutivo = service.incrementar_consecutivo(empresa.id)  # usa el 100

    assert service.revertir_consecutivo(empresa.id, consecutivo) is True

    resolucion = (
        db_session.query(ResolucionDocumentoSoporte).filter(ResolucionDocumentoSoporte.empresa_id == empresa.id).one()
    )
    db_session.refresh(resolucion)
    assert resolucion.consecutivo_actual == 100


def test_revertir_consecutivo_no_aplica_si_otro_envio_ya_avanzo_el_contador(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=100, rango_maximo=1000))
    primero = service.incrementar_consecutivo(empresa.id)
    service.incrementar_consecutivo(empresa.id)

    assert service.revertir_consecutivo(empresa.id, primero) is False

    resolucion = (
        db_session.query(ResolucionDocumentoSoporte).filter(ResolucionDocumentoSoporte.empresa_id == empresa.id).one()
    )
    db_session.refresh(resolucion)
    assert resolucion.consecutivo_actual == 102


class _FakeAlegraClient:
    def __init__(self, response=None, error=None):
        self._response = response
        self._error = error

    def get_resolution(self, nit: str) -> dict:
        if self._error:
            raise self._error
        return self._response or {}


def _rango_alegra(**overrides) -> dict:
    data = {
        "resolutionNumber": "18764000001",
        "prefix": "DS",
        "minNumber": 1,
        "maxNumber": 500,
        "startDate": "2026-01-01",
        "endDate": "2028-01-01",
    }
    data.update(overrides)
    return data


def test_cargar_desde_alegra_lista_primero_los_rangos_sin_technical_key(db_session):
    """Alegra mezcla rangos de facturacion y documento soporte sin campo de
    tipo -- los de documento soporte no traen technicalKey, van primero."""
    empresa = _crear_empresa(db_session)
    factura = _rango_alegra(resolutionNumber="18760000001", prefix="FE", technicalKey="abc123")
    soporte = _rango_alegra()
    service = ResolucionDocumentoSoporteService(
        db_session, alegra_client=_FakeAlegraClient(response={"resolutions": [factura, soporte]})
    )

    resultado = service.cargar_desde_alegra(empresa.id)

    assert [r.numero_resolucion for r in resultado.resoluciones] == ["18764000001", "18760000001"]
    assert resultado.resoluciones[0].prefijo == "DS"


def test_cargar_desde_alegra_rango_sin_prefijo(db_session):
    empresa = _crear_empresa(db_session)
    sin_prefijo = _rango_alegra()
    del sin_prefijo["prefix"]
    service = ResolucionDocumentoSoporteService(
        db_session, alegra_client=_FakeAlegraClient(response={"resolutions": [sin_prefijo]})
    )

    assert service.cargar_desde_alegra(empresa.id).resoluciones[0].prefijo == ""


def test_cargar_desde_alegra_sin_resoluciones_da_404(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDocumentoSoporteService(
        db_session, alegra_client=_FakeAlegraClient(response={"resolutions": []})
    )

    with pytest.raises(HTTPException) as exc_info:
        service.cargar_desde_alegra(empresa.id)
    assert exc_info.value.status_code == 404


def test_cargar_desde_alegra_errores_de_alegra(db_session):
    empresa = _crear_empresa(db_session)
    casos = [
        (AlegraApiError(404, {"errors": [{"code": "AEP9006", "message": "Production only"}]}), 400),
        (AlegraTransientError("timeout"), 502),
    ]
    for error, esperado in casos:
        service = ResolucionDocumentoSoporteService(db_session, alegra_client=_FakeAlegraClient(error=error))
        with pytest.raises(HTTPException) as exc_info:
            service.cargar_desde_alegra(empresa.id)
        assert exc_info.value.status_code == esperado
