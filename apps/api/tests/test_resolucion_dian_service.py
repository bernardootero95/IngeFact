import threading
import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.application.resolucion_dian_service import ResolucionDianService
from src.core.alegra_client import AlegraApiError
from src.domain.resolucion_dian import GuardarResolucionDianRequest
from src.infrastructure.db.models import Empresa, ResolucionDian
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


def _payload(**overrides) -> GuardarResolucionDianRequest:
    data = {
        "numero_resolucion": "18760000001",
        "prefijo": "SETP",
        "rango_minimo": 1,
        "rango_maximo": 1000,
        "fecha_inicio": date(2026, 1, 1),
        "fecha_fin": date(2030, 1, 1),
        "technical_key": "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
    }
    data.update(overrides)
    return GuardarResolucionDianRequest(**data)


class _FakeAlegraClient:
    def __init__(self, response=None, error: AlegraApiError | None = None):
        self._response = response
        self._error = error

    def get_resolution(self, nit: str) -> dict:
        if self._error:
            raise self._error
        return self._response or {}


def test_guardar_crea_con_consecutivo_en_rango_minimo(db_session):
    empresa = _crear_empresa(db_session)

    resolucion = ResolucionDianService(db_session).guardar(empresa.id, _payload(rango_minimo=100))

    assert resolucion.consecutivo_actual == 100
    assert resolucion.estado_validacion == "pendiente"


def test_guardar_actualiza_y_resetea_consecutivo(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDianService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=100))

    actualizada = service.guardar(empresa.id, _payload(rango_minimo=500))

    assert actualizada.consecutivo_actual == 500
    todas = db_session.query(ResolucionDian).filter(ResolucionDian.empresa_id == empresa.id).all()
    assert len(todas) == 1  # actualizo la misma fila, no creo una segunda


def test_validar_ante_alegra_exito_marca_validada(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDianService(db_session, alegra_client=_FakeAlegraClient(response={"resolution": {}}))
    service.guardar(empresa.id, _payload())

    resolucion = service.validar_ante_alegra(empresa.id)

    assert resolucion.estado_validacion == "validada"
    assert resolucion.mensaje_validacion is None
    assert resolucion.fecha_ultima_validacion is not None


def test_validar_ante_alegra_error_guarda_mensaje_mapeado(db_session):
    empresa = _crear_empresa(db_session)
    error = AlegraApiError(404, {"errors": [{"code": "AEP9006", "message": "Environment not supported"}]})
    service = ResolucionDianService(db_session, alegra_client=_FakeAlegraClient(error=error))
    service.guardar(empresa.id, _payload())

    resolucion = service.validar_ante_alegra(empresa.id)

    assert resolucion.estado_validacion == "error"
    assert "produccion" in resolucion.mensaje_validacion.lower()


def test_obtener_o_404_sin_resolucion(db_session):
    empresa = _crear_empresa(db_session)
    with pytest.raises(HTTPException) as exc_info:
        ResolucionDianService(db_session).obtener_o_404(empresa.id)
    assert exc_info.value.status_code == 404


def test_incrementar_consecutivo_se_agota_en_el_rango_maximo(db_session):
    empresa = _crear_empresa(db_session)
    service = ResolucionDianService(db_session)
    service.guardar(empresa.id, _payload(rango_minimo=1, rango_maximo=2))

    assert service.incrementar_consecutivo(empresa.id) == 2

    with pytest.raises(HTTPException) as exc_info:
        service.incrementar_consecutivo(empresa.id)
    assert exc_info.value.status_code == 409


def test_incrementar_consecutivo_es_seguro_bajo_concurrencia(db_session):
    """Blindaje contra condiciones de carrera: N hilos con sesiones de BD
    independientes incrementando la misma resolucion a la vez no deben
    repetir ni saltarse ningun numero -- el resultado final debe ser
    exactamente rango_minimo + N."""
    empresa = _crear_empresa(db_session)
    rango_minimo = 1
    n_hilos = 20
    ResolucionDianService(db_session).guardar(
        empresa.id, _payload(rango_minimo=rango_minimo, rango_maximo=rango_minimo + n_hilos)
    )

    engine = create_engine(TEST_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    resultados: list[int] = []
    lock = threading.Lock()

    def _incrementar():
        session = SessionLocal()
        try:
            valor = ResolucionDianService(session).incrementar_consecutivo(empresa.id)
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

    final = db_session.get(ResolucionDian, ResolucionDianService(db_session).obtener(empresa.id).id)
    assert final.consecutivo_actual == rango_minimo + n_hilos
