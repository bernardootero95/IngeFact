import threading
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.application.resolucion_documento_soporte_service import ResolucionDocumentoSoporteService
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
    service.incrementar_consecutivo(empresa.id)  # consecutivo_actual pasa a 2

    with pytest.raises(HTTPException) as exc_info:
        service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=1000, consecutivo_actual=1))
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

    assert service.incrementar_consecutivo(empresa.id) == 2

    with pytest.raises(HTTPException) as exc_info:
        service.incrementar_consecutivo(empresa.id)
    assert exc_info.value.status_code == 409


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

    assert sorted(resultados) == list(range(rango_minimo + 1, rango_minimo + n_hilos + 1))
